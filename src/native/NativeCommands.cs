using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
public class NativeEntry {
    public string name,filename,typeName,category,modifiedTime,comment;
    public int dataSize,type;
}
public static partial class ProjectBuild {
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int DirectoryApi(IntPtr s,IntPtr l,IntPtr c,int size,Callback cb,IntPtr user);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int EntryInfoApi(IntPtr s,IntPtr l,IntPtr n,int t,IntPtr info);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int ExportApi(IntPtr s,IntPtr l,IntPtr n,int t,IntPtr text,int size);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int ImportApi(IntPtr s,IntPtr l,IntPtr n,int t,IntPtr comment,IntPtr text,int size,Callback cb,IntPtr user);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int CreateLibraryApi(IntPtr s,IntPtr l,IntPtr comment);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int DeleteLibraryApi(IntPtr s,IntPtr l);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int DeleteEntryApi(IntPtr s,IntPtr l,IntPtr n,int type);
    static readonly string[] typeNames={"Application","DataWindow","Function","Menu","Query","Structure","UserObject","Window","Pipeline","Project","ProxyObject","Binary"};
    static readonly string[] extensions={"sra","srd","srf","srm","srq","srs","sru","srw","srp","srj","srx","bin"};
    static List<NativeEntry> directoryEntries;
    static string directoryError;
    static string commandPbt;
    static string LibraryPath(string baseDir,string value){string file=Path.GetFullPath(Path.Combine(baseDir,value));if(File.Exists(file))return file;file=Path.Combine(baseDir,Path.GetFileName(value));if(File.Exists(file))return file;throw new FileNotFoundException("PBT library not found",file);}
    static void OnDirectory(IntPtr p,IntPtr user) {
        try {
            int offset=unicode?512:256;
            int time=Marshal.ReadInt32(p,offset),size=Marshal.ReadInt32(p,offset+4),type=Marshal.ReadInt32(p,offset+12);
            string name=ReadText(Marshal.ReadIntPtr(p,offset+8));
            if(type<0||type>=typeNames.Length)throw new InvalidDataException("Unknown ORCA entry type "+type);
            directoryEntries.Add(new NativeEntry {name=name,filename=name+"."+extensions[type],typeName=typeNames[type],type=type,category=type==11?"BINARY":"SOURCE",dataSize=size,modifiedTime=new DateTime(1970,1,1,0,0,0,DateTimeKind.Utc).AddSeconds((uint)time).ToString("o"),comment=ReadText(p)});
        }catch(Exception ex){directoryError=ex.Message;}
    }
    static List<NativeEntry> Entries(string library) {
        directoryEntries=new List<NativeEntry>();directoryError=null;Callback cb=OnDirectory;
        Check(Api<DirectoryApi>("pb_directory")(activeSession,Text(library),Memory(1024),1024,cb,IntPtr.Zero));GC.KeepAlive(cb);
        if(directoryError!=null)throw new InvalidDataException(directoryError);
        return directoryEntries;
    }
    static string Source(string library,NativeEntry e) {
        IntPtr info=Memory(1024);Check(Api<EntryInfoApi>("pb_entry_info")(activeSession,Text(library),Text(e.name),e.type,info));
        int size=Marshal.ReadInt32(info,(unicode?512:256)+8);
        if(size<0||size>128*1024*1024)throw new InvalidDataException("Invalid source size "+size);
        int capacity=checked(size*2+4096);IntPtr buffer=Memory(capacity);
        Marshal.Copy(new byte[capacity],0,buffer,capacity);
        Check(Api<ExportApi>("pb_export")(activeSession,Text(library),Text(e.name),e.type,buffer,capacity));
        string source=ReadText(buffer);
        return source.StartsWith("$PBExportHeader$",StringComparison.OrdinalIgnoreCase)?source:"$PBExportHeader$"+e.filename+"\r\n"+source;
    }
    static string ReadSource(string file) {
        byte[] bytes=File.ReadAllBytes(file);
        if(bytes.Length>=2&&bytes[0]==255&&bytes[1]==254)return Encoding.Unicode.GetString(bytes,2,bytes.Length-2);
        if(bytes.Length>=2&&bytes[0]==254&&bytes[1]==255)return Encoding.BigEndianUnicode.GetString(bytes,2,bytes.Length-2);
        try{return new UTF8Encoding(false,true).GetString(bytes).TrimStart('\uFEFF');}catch(DecoderFallbackException){return Encoding.Default.GetString(bytes);}
    }
    static void SetContext(string library,int type) {
        string baseDir=Path.GetDirectoryName(library),pbt=Path.ChangeExtension(library,".pbt");
        if(commandPbt!=null){pbt=commandPbt;baseDir=Path.GetDirectoryName(pbt);if(!File.Exists(pbt))throw new FileNotFoundException("PBT not found",pbt);}
        string[] libraries={library};string appLibrary=null,appName=null;
        if(!File.Exists(pbt)) {
            var found=new List<string>();
            foreach(var file in System.IO.Directory.GetFiles(baseDir,"*.pbt")) {
                string text=ReadSource(file);var m=Regex.Match(text,"(?im)^\\s*liblist\\s+\"([^\"]*)\"");
                if(m.Success)foreach(string value in m.Groups[1].Value.Split(';'))if(!String.IsNullOrWhiteSpace(value)&&Path.GetFullPath(Path.Combine(baseDir,value)).Equals(library,StringComparison.OrdinalIgnoreCase)){found.Add(file);break;}
            }
            if(found.Count>1)throw new InvalidOperationException("Several PBT targets reference this library; use an explicit project context.");
            if(found.Count==1)pbt=found[0];
        }
        if(File.Exists(pbt)) {
            string text=ReadSource(pbt);
            var l=Regex.Match(text,"(?im)^\\s*liblist\\s+\"([^\"]*)\"");
            var a=Regex.Match(text,"(?im)^\\s*applib\\s+\"([^\"]*)\"");
            var n=Regex.Match(text,"(?im)^\\s*appname\\s+\"([^\"]*)\"");
            if(!l.Success||!a.Success||!n.Success)throw new InvalidDataException("Invalid PBT: "+pbt);
            var paths=new List<string>();foreach(string value in l.Groups[1].Value.Split(';'))if(!String.IsNullOrWhiteSpace(value))paths.Add(LibraryPath(baseDir,value));
            if(!paths.Exists(x=>x.Equals(library,StringComparison.OrdinalIgnoreCase)))throw new InvalidDataException("PBT does not reference the requested library");
            libraries=paths.ToArray();appLibrary=LibraryPath(baseDir,a.Groups[1].Value);appName=n.Groups[1].Value;
        }else{
            var apps=Entries(library).FindAll(x=>x.type==0);
            if(apps.Count>1)throw new InvalidOperationException("Several application objects; supply a PBT.");
            if(apps.Count==1){appLibrary=library;appName=apps[0].name;}
        }
        IntPtr names=Memory(libraries.Length*4);for(int i=0;i<libraries.Length;i++)Marshal.WriteIntPtr(names,i*4,Text(libraries[i]));
        Check(Api<SetLibraries>("pb_libraries")(activeSession,names,libraries.Length));
        Check(Api<SetApplication>("pb_application")(activeSession,Text(appLibrary),Text(appName)));
    }
    static int DetectVersion(string file) {
        int specified;string value=Environment.GetEnvironmentVariable("PB_VERSION");
        if(!String.IsNullOrEmpty(value)){if(!Int32.TryParse(value,out specified)||specified<=0)throw new ArgumentException("Invalid PB_VERSION");return specified;}
        // The header distinguishes ANSI/Unicode only, not an exact compiler version.
        // Read-only defaults preserve the PB8 workflow; mutations should pass a version.
        if(File.Exists(file)){byte[] b=new byte[6];using(var stream=File.OpenRead(file)){if(stream.Read(b,0,6)==6&&b[5]==0)return 125;}}
        return 80;
    }
    static object ExecuteCommand(string[] args) {
        var items=new List<string>(args);int version=0;string runtime=null;
        while(items.Count>0&&items[0].StartsWith("--")) {
            string flag=items[0];items.RemoveAt(0);
            if(flag.StartsWith("--version="))version=Int32.Parse(flag.Substring(10));
            else if(flag.StartsWith("--runtime-dir="))runtime=flag.Substring(14);
            else if(flag.StartsWith("--pbt="))commandPbt=Path.GetFullPath(flag.Substring(6));
            else throw new ArgumentException("Unknown option "+flag);
        }
        if(items.Count<2)throw new ArgumentException("pb-native-host [--version=80] info|list|export|export-all|sync-source|import|delete|create-pbl|delete-pbl <library> [arguments]");
        string command=items[0],library=Path.GetFullPath(items[1]);
        if(version==0)version=DetectVersion(library);
        config=new BuildConfig{pbVersion=version};
        if(command=="delete-pbl") {File.Delete(library);File.Delete(Path.ChangeExtension(library,".pbd"));return new {success=true,path=library,action="deleted",returnCode=0};}
        OpenRuntime(version,runtime);
        if(command=="create-pbl") {
            if(File.Exists(library))throw new IOException("Library already exists: "+library);
            System.IO.Directory.CreateDirectory(Path.GetDirectoryName(library));
            Check(Api<CreateLibraryApi>("pb_create_library")(activeSession,Text(library),Text(items.Count>2?items[2]:"")));
            return new {success=true,path=library,returnCode=0};
        }
        var entries=Entries(library);
        if(command=="list")return entries.FindAll(x=>items.Count<3||x.typeName.Equals(items[2],StringComparison.OrdinalIgnoreCase)||items[2]=="SOURCE"&&x.category=="SOURCE");
        if(command=="info")return new {path=library,version="runtime PB"+version,runtimeDir=loadedRuntime,format=unicode?"Unicode":"ANSI",isUnicode=unicode,entryCount=entries.Count};
        if(command=="export") {
            if(items.Count<4)throw new ArgumentException("export requires object and destination");
            var e=entries.Find(x=>x.name.Equals(items[2],StringComparison.OrdinalIgnoreCase));if(e==null)throw new FileNotFoundException("Object not found: "+items[2]);
            string file=Path.GetFullPath(items[3]);System.IO.Directory.CreateDirectory(Path.GetDirectoryName(file));File.WriteAllText(file,Source(library,e),new UTF8Encoding(false));
            return new {success=true,filePath=file,filename=e.filename,typeName=e.typeName};
        }
        if(command=="export-all"||command=="sync-source") {
            if(items.Count<3)throw new ArgumentException("Output directory required");
            string name=Path.GetFileNameWithoutExtension(library);
            string target=Path.GetFullPath(items[2]);
            string dir=command=="sync-source"?Path.Combine(Path.GetFileName(target).Equals("pb_ai_src",StringComparison.OrdinalIgnoreCase)?target:Path.Combine(target,"pb_ai_src"),name):Path.Combine(target,name);
            System.IO.Directory.CreateDirectory(dir);var written=new List<object>();int skipped=0;
            foreach(var e in entries)if(e.category=="SOURCE") {
                string file=Path.Combine(dir,e.filename),source=Source(library,e);
                DateTime objectTime=DateTime.Parse(e.modifiedTime).ToUniversalTime();
                if(command=="sync-source"&&File.Exists(file)&&(File.ReadAllText(file,Encoding.UTF8)==source||File.GetLastWriteTimeUtc(file)>objectTime)){skipped++;continue;}
                File.WriteAllText(file,source,new UTF8Encoding(false));File.SetLastWriteTimeUtc(file,objectTime);written.Add(new{name=e.name,filename=e.filename,typeName=e.typeName,filePath=file,modifiedTime=e.modifiedTime,action="exported"});
            }
            return new {success=true,pblName=name,outputDir=dir,syncDir=dir,exported=written,synced=written,skipped=skipped};
        }
        if(command=="delete") {
            if(items.Count<3)throw new ArgumentException("Object required");
            var e=entries.Find(x=>x.name.Equals(items[2],StringComparison.OrdinalIgnoreCase));if(e==null)throw new FileNotFoundException("Object not found");
            int deleteCode=Api<DeleteEntryApi>("pb_delete_entry")(activeSession,Text(library),Text(e.name),e.type);
            // PB8 can report a missing auxiliary application entry after deleting its source.
            if(deleteCode==-3&&Entries(library).Find(x=>x.name.Equals(e.name,StringComparison.OrdinalIgnoreCase)&&x.type==e.type)==null)deleteCode=0;
            Check(deleteCode);
            return new{success=true,returnCode=0};
        }
        if(command=="import") {
            if(items.Count<4)throw new ArgumentException("import requires source path and object name");
            string source=ReadSource(items[2]),name=items[3],extension=Path.GetExtension(items[2]).TrimStart('.').ToLowerInvariant();
            var header=Regex.Match(source,@"(?im)^\$PBExportHeader\$(.+)\s*$");if(header.Success)extension=Path.GetExtension(header.Groups[1].Value.Trim()).TrimStart('.').ToLowerInvariant();
            int type=Array.IndexOf(extensions,extension);var existing=entries.Find(x=>x.name.Equals(name,StringComparison.OrdinalIgnoreCase));
            if(type<0&&existing!=null)type=existing.type;if(type<0)throw new ArgumentException("Source extension/header does not identify a PB object type.");
            source=Regex.Replace(source,@"(?im)^\$PBExport(?:Header|Comments)\$[^\r\n]*(?:\r?\n)?","");
            SetContext(library,type);Callback cb=OnCompile;
            int size=(unicode?Encoding.Unicode:Encoding.Default).GetByteCount(source);
            int rc=Api<ImportApi>("pb_import")(activeSession,Text(library),Text(name),type,Text(existing==null?"":existing.comment),Text(source),size,cb,IntPtr.Zero);GC.KeepAlive(cb);
            if(rc!=0)throw new InvalidOperationException("Import failed: "+rc+" "+SessionError()+" "+json.Serialize(result.diagnostics));
            return new {success=true,action="imported",name=name,returnCode=rc,errors=result.diagnostics};
        }
        throw new ArgumentException("Unknown command: "+command);
    }
    static int RunCommand(string[] args) {
        int rc=0;object output;
        try{output=ExecuteCommand(args);}catch(Exception ex){rc=1;output=new{success=false,error=ex.Message,returnCode=-1,errors=result.diagnostics};}
        finally{if(activeSession!=IntPtr.Zero)Api<Close>("pb_close")(activeSession);foreach(var p in allocations)Marshal.FreeHGlobal(p);}
        Console.WriteLine(json.Serialize(output));return rc;
    }
}
