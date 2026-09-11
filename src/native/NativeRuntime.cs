using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.Win32;
public static partial class ProjectBuild {
    static string loadedRuntime;
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int LoadNative(int version,IntPtr directory);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate IntPtr NativeError();
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int GetError(IntPtr session,IntPtr buffer,int size);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int ProgressSupported();
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate void NativeProgress(int phase,IntPtr name,IntPtr library,IntPtr user);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate void SetProgress(NativeProgress callback,IntPtr user);
    static void OnObjectProgress(int phase,IntPtr name,IntPtr library,IntPtr user) {
        try {
            if(name==IntPtr.Zero)return;
            Log(new {objectEvent=phase>=100?"writing":"progress",sequence=++objectSequence,phase=phase>=100?phase-100:phase,name=ReadText(name),library=ReadText(library)});
        }catch(Exception ex){result.error="Object progress: "+ex.Message;}
    }
    static string RuntimeDirectory(int version,string supplied) {
        string file=version==50?"pborc050.dll":"pborc"+version+".dll";
        string explicitDir=supplied??Environment.GetEnvironmentVariable("PB_RUNTIME_DIR");
        if(!String.IsNullOrWhiteSpace(explicitDir)) {
            explicitDir=Path.GetFullPath(explicitDir);
            if(!File.Exists(Path.Combine(explicitDir,file)))throw new FileNotFoundException("Runtime directory does not contain "+file,explicitDir);
            return explicitDir;
        }
        var candidates=new List<string>();
        string label=(version/10)+"."+(version%10);
        foreach(var hive in new[]{Registry.LocalMachine,Registry.CurrentUser}) {
            using(var key=hive.OpenSubKey(@"SOFTWARE\Sybase\PowerBuilder\"+label))if(key!=null) {
                foreach(string field in new[]{"Location","InitPath"}) {
                    var location=key.GetValue(field) as string;
                    if(!String.IsNullOrEmpty(location)) {
                        candidates.Add(location);
                        candidates.Add(Path.GetFullPath(Path.Combine(location,@"..\Shared\PowerBuilder")));
                    }
                }
            }
        }
        candidates.AddRange((Environment.GetEnvironmentVariable("PATH")??"").Split(';'));
        foreach(string candidate in candidates)if(!String.IsNullOrWhiteSpace(candidate)&&File.Exists(Path.Combine(candidate.Trim('"'),file)))return Path.GetFullPath(candidate.Trim('"'));
        throw new FileNotFoundException("Vendor runtime not found: "+file+". Set PB_RUNTIME_DIR or --runtime-dir to your installed PowerBuilder runtime directory.");
    }
    static IntPtr OpenRuntime(int version,string directory) {
        if(version!=80&&version!=90&&version!=125)throw new ArgumentException("This native adapter currently supports PB8, PB9 and PB12.5 (80/90/125).");
        unicode=version>=100;
        dll=LoadLibrary(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"pb-native.dll"));
        if(dll==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"Cannot load pb-native.dll (x86)");
        string runtime=RuntimeDirectory(version,directory);
        loadedRuntime=runtime;
        IntPtr text=Marshal.StringToHGlobalUni(runtime);
        int code;try{code=Api<LoadNative>("pb_load")(version,text);}finally{Marshal.FreeHGlobal(text);}
        if(code!=0)throw new InvalidOperationException(Marshal.PtrToStringAnsi(Api<NativeError>("pb_error")()));
        activeSession=Api<Open>("pb_open")();
        if(activeSession==IntPtr.Zero)throw new InvalidOperationException("Vendor ORCA could not open PB"+version+" session.");
        return activeSession;
    }
    static string SessionError() {
        if(activeSession==IntPtr.Zero)return "";
        IntPtr buffer=Memory(4096);
        Marshal.Copy(new byte[4096],0,buffer,4096);
        Api<GetError>("pb_session_error")(activeSession,buffer,4096);
        string message=ReadText(buffer);
        return String.IsNullOrEmpty(message)?Marshal.PtrToStringAnsi(Api<NativeError>("pb_error")()):message;
    }
    static string EnsureIcon() {
        if(!String.IsNullOrEmpty(config.iconPath))return config.iconPath;
        string file=Path.Combine(config.baseDir,".pb-ai-icon-"+Guid.NewGuid().ToString("N")+".ico");
        using(var w=new BinaryWriter(File.Create(file))) {
            w.Write((ushort)0);w.Write((ushort)1);w.Write((ushort)1);
            w.Write((byte)1);w.Write((byte)1);w.Write((byte)0);w.Write((byte)0);
            w.Write((ushort)1);w.Write((ushort)32);w.Write((uint)48);w.Write((uint)22);
            w.Write((uint)40);w.Write(1);w.Write(2);w.Write((ushort)1);w.Write((ushort)32);
            w.Write((uint)0);w.Write((uint)4);w.Write(0);w.Write(0);w.Write(0);w.Write(0);
            w.Write(new byte[]{0xA0,0x70,0x30,0xFF,0,0,0,0});
        }
        temporaryFiles.Add(file);return file;
    }
}
