using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;

// x86 bridge for the existing PBSpy ORCA exports. Build with .NET Framework csc.
public class BuildConfig {
    public int pbVersion;
    public string baseDir, appName, appLibrary, action, exePath, iconPath;
    public string[] libraries, pbrLines;
    public int[] pbdFlags;
    public string[][] libraryPbrLines;
    public string company, product, description, copyright, fileVersion, fileVersionNum, productVersion, productVersionNum;
    public string logPath;
}
public class Diagnostic {
    public int level;
    public string messageNumber, messageText;
    public uint line, column;
    public bool isError;
}
public class BuildResult {
    public bool success;
    public int returnCode;
    public string stage, error, exePath;
    public List<Diagnostic> diagnostics = new List<Diagnostic>();
    public List<string> linkErrors = new List<string>();
    public List<string> artifacts = new List<string>();
}
public static class ProjectBuild {
    [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr LoadLibrary(string path);
    [DllImport("kernel32", CharSet=CharSet.Ansi, ExactSpelling=true)] static extern IntPtr GetProcAddress(IntPtr module, string name);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate IntPtr Open(int version);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate void Close(IntPtr session);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int SetLibraries(IntPtr session, IntPtr names, int count);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int SetApplication(IntPtr session, IntPtr library, IntPtr application);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int Rebuild(IntPtr session, int mode, Callback callback, IntPtr user);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int Regenerate(IntPtr session, IntPtr library, IntPtr name, int type, Callback callback, IntPtr user);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int DynamicLibrary(IntPtr session, IntPtr library, IntPtr pbr, int flags);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int Executable(IntPtr session, IntPtr exe, IntPtr icon, IntPtr pbr, Callback callback, IntPtr user, IntPtr flags, int count, int codeFlags);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int SetExeInfo(IntPtr session, IntPtr info);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate void Callback(IntPtr message, IntPtr user);
    [StructLayout(LayoutKind.Sequential)] struct CompileMessage {
        public int level;
        public IntPtr number, text;
        public uint column, line;
    }
    static BuildConfig config;
    static BuildResult result = new BuildResult();
    static IntPtr dll;
    static bool unicode;
    static readonly List<IntPtr> allocations = new List<IntPtr>();
    static readonly List<string> temporaryFiles = new List<string>();
    static readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = Int32.MaxValue };
    static T Api<T>(string name) where T:class {
        IntPtr pointer = GetProcAddress(dll, name);
        if(pointer==IntPtr.Zero) throw new EntryPointNotFoundException(name);
        return Marshal.GetDelegateForFunctionPointer(pointer, typeof(T)) as T;
    }
    static IntPtr Text(string value) {
        if(String.IsNullOrEmpty(value)) return IntPtr.Zero;
        if(!unicode && Encoding.Default.GetString(Encoding.Default.GetBytes(value))!=value)
            throw new InvalidOperationException("The current ANSI code page cannot represent a path or resource string: " + value);
        IntPtr pointer=unicode?Marshal.StringToHGlobalUni(value):Marshal.StringToHGlobalAnsi(value);
        allocations.Add(pointer); return pointer;
    }
    static IntPtr Memory(int size) {var p=Marshal.AllocHGlobal(size); allocations.Add(p); return p;}
    static string ReadText(IntPtr p) {return p==IntPtr.Zero?"":(unicode?Marshal.PtrToStringUni(p):Marshal.PtrToStringAnsi(p));}
    static void Log(object value) {
        File.AppendAllText(config.logPath, json.Serialize(value)+Environment.NewLine, new UTF8Encoding(false));
    }
    static void Stage(string stage) {result.stage=stage; Log(new { stage=stage, time=DateTime.UtcNow.ToString("o") });}
    static void Check(int code) {result.returnCode=code; if(code!=0) throw new InvalidOperationException(result.stage+" failed; ORCA return code="+code);}
    static void OnCompile(IntPtr pointer, IntPtr user) {
        try {
            var m=(CompileMessage)Marshal.PtrToStructure(pointer,typeof(CompileMessage));
            string text=ReadText(m.text), number=ReadText(m.number);
            // PBSpy returns PB8 compiler errors as level 4; Info is level 0.
            bool error=m.level>=2 || System.Text.RegularExpressions.Regex.IsMatch(text,@"\b(Error|Fatal)\s+C\d+",System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            var item=new Diagnostic{level=m.level,messageNumber=number,messageText=text,line=m.line,column=m.column,isError=error};
            result.diagnostics.Add(item); Log(item);
        } catch(Exception ex) {result.error="Compile callback: "+ex.Message;}
    }
    static void OnLink(IntPtr pointer, IntPtr user) {
        try {var text=ReadText(Marshal.ReadIntPtr(pointer)); result.linkErrors.Add(text); Log(new {linkMessage=text});}
        catch(Exception ex) {result.error="Link callback: "+ex.Message;}
    }
    static string MakePbr(string[] lines) {
        if(lines==null || lines.Length==0) return null;
        string name=Path.Combine(config.baseDir,".pb-ai-resources-"+Guid.NewGuid().ToString("N")+".pbr");
        string content=String.Join("\r\n",lines)+"\r\n";
        Encoding encoding=unicode?Encoding.Unicode:Encoding.Default;
        if(encoding.GetString(encoding.GetBytes(content))!=content) throw new InvalidOperationException("Resource list cannot be encoded for this PB version");
        File.WriteAllText(name,content,encoding);temporaryFiles.Add(name);return name;
    }
    static void VerifyArtifact(string file) {
        if(!File.Exists(file)||new FileInfo(file).Length==0) throw new IOException("ORCA returned success but output is missing or empty: "+file);
        result.artifacts.Add(file);
    }
    static void Build() {
        unicode=config.pbVersion>=100;
        Directory.SetCurrentDirectory(config.baseDir);
        dll=LoadLibrary(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"PBSpy.dll"));
        if(dll==IntPtr.Zero) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Cannot load PBSpy.dll");
        Stage("open-session");
        IntPtr session=Api<Open>("PBORCA_SessionOpenWithVersion")(config.pbVersion);
        if(session==IntPtr.Zero) throw new InvalidOperationException("PBSpy did not open a PB"+config.pbVersion+" session");
        Callback compile=OnCompile, link=OnLink;
        try {
            Stage("set-library-list");
            IntPtr libs=Memory(config.libraries.Length*IntPtr.Size);
            for(int i=0;i<config.libraries.Length;i++) Marshal.WriteIntPtr(libs,i*IntPtr.Size,Text(config.libraries[i]));
            Check(Api<SetLibraries>("PBORCA_SessionSetLibraryList")(session,libs,config.libraries.Length));
            Stage("set-application");
            Check(Api<SetApplication>("PBORCA_SessionSetCurrentAppl")(session,Text(config.appLibrary),Text(config.appName)));
            if(config.action!="package") {
            Stage(config.action=="probe"?"regenerate-application":"full-rebuild");
            int code=config.action=="probe"
                ?Api<Regenerate>("PBORCA_CompileEntryRegenerate")(session,Text(config.appLibrary),Text(config.appName),0,compile,IntPtr.Zero)
                :Api<Rebuild>("PBORCA_ApplicationRebuild")(session,0,compile,IntPtr.Zero);
            Check(code);
            if(result.error!=null || result.diagnostics.Exists(x=>x.isError)) throw new InvalidOperationException(result.error??"Compiler reported errors");
            }
            if(config.action=="build" || config.action=="package") {
                for(int i=0;i<config.libraries.Length;i++) {
                    if(config.pbdFlags[i]==0) continue;
                    Stage("create-pbd: "+config.libraries[i]);
                    var lines=config.libraryPbrLines==null?null:config.libraryPbrLines[i];
                    Check(Api<DynamicLibrary>("PBORCA_DynamicLibraryCreate")(session,Text(config.libraries[i]),Text(MakePbr(lines)),0));
                    VerifyArtifact(Path.ChangeExtension(config.libraries[i],".pbd"));
                }
                Stage("set-exe-info");
                string[] info={config.company??"",config.product??config.appName,config.description??config.appName,config.copyright??"",config.fileVersion??"1.0.0.0",config.fileVersionNum??"1,0,0,0",config.productVersion??"1.0.0.0",config.productVersionNum??"1,0,0,0"};
                IntPtr infoPtr=Memory(info.Length*IntPtr.Size);
                for(int i=0;i<info.Length;i++) Marshal.WriteIntPtr(infoPtr,i*IntPtr.Size,Text(info[i]));
                Check(Api<SetExeInfo>("PBORCA_SetExeInfo")(session,infoPtr));
                Stage("create-exe");
                IntPtr flags=Memory(config.pbdFlags.Length*4);Marshal.Copy(config.pbdFlags,0,flags,config.pbdFlags.Length);
                Check(Api<Executable>("PBORCA_ExecutableCreate")(session,Text(config.exePath),Text(config.iconPath),Text(MakePbr(config.pbrLines)),link,IntPtr.Zero,flags,config.pbdFlags.Length,0));
                if(result.error!=null) throw new InvalidOperationException(result.error);
                VerifyArtifact(config.exePath);result.exePath=config.exePath;
            }
            result.success=true;Stage("complete");
        } finally {
            GC.KeepAlive(compile);GC.KeepAlive(link);
            Api<Close>("PBORCA_SessionClose")(session);
        }
    }
    public static int Main(string[] args) {
        Console.OutputEncoding=new UTF8Encoding(false);
        try {
            config=json.Deserialize<BuildConfig>(File.ReadAllText(args[0],Encoding.UTF8));
            Build();
        } catch(Exception ex) {result.success=false;result.error=ex.ToString();}
        finally {
            foreach(var p in allocations) Marshal.FreeHGlobal(p);
            foreach(var file in temporaryFiles) {try{File.Delete(file);}catch{}}
        }
        Console.WriteLine(json.Serialize(result));return result.success?0:1;
    }
}

