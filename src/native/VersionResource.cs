using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class VersionResource {
    [DllImport("kernel32",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr BeginUpdateResource(string file,bool deleteExisting);
    [DllImport("kernel32",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool UpdateResource(IntPtr handle,IntPtr type,IntPtr name,ushort lang,byte[] data,uint size);
    [DllImport("kernel32",SetLastError=true)] static extern bool EndUpdateResource(IntPtr handle,bool discard);
    static void Pad(BinaryWriter w){while(w.BaseStream.Position%4!=0)w.Write((byte)0);}
    static byte[] Block(string key,ushort type,ushort length,byte[] value,params byte[][] children) {
        using(var stream=new MemoryStream())using(var w=new BinaryWriter(stream)) {
            w.Write((ushort)0);w.Write(length);w.Write(type);w.Write(Encoding.Unicode.GetBytes(key+"\0"));Pad(w);w.Write(value);
            foreach(var child in children){Pad(w);w.Write(child);}long size=stream.Length;if(size>65535)throw new ArgumentException("Version resource too large");stream.Position=0;w.Write((ushort)size);return stream.ToArray();
        }
    }
    static uint[] Version(string text) {
        string[] parts=(text??"1,0,0,0").Replace('.',',').Split(',');if(parts.Length!=4)throw new ArgumentException("Version number requires four components");
        uint[] n=new uint[4];for(int i=0;i<4;i++)if(!UInt32.TryParse(parts[i],out n[i])||n[i]>65535)throw new ArgumentException("Invalid version number");return new[]{(n[0]<<16)|n[1],(n[2]<<16)|n[3]};
    }
    static int OverlayStart(byte[] file) {
        int pe=BitConverter.ToInt32(file,60),count=BitConverter.ToUInt16(file,pe+6),start=pe+24+BitConverter.ToUInt16(file,pe+20),end=0;
        for(int i=0;i<count;i++){int offset=start+40*i;end=Math.Max(end,checked(BitConverter.ToInt32(file,offset+20)+BitConverter.ToInt32(file,offset+16)));}
        if(end<0||end>file.Length)throw new InvalidDataException("Invalid PE sections");return end;
    }
    public static void Write(string file,BuildConfig c) {
        // UpdateResource discards the appended PB executable library. Preserve it.
        byte[] original=File.ReadAllBytes(file);int overlay=OverlayStart(original);
        var f=Version(c.fileVersionNum);var p=Version(c.productVersionNum);
        byte[] fixedInfo;using(var m=new MemoryStream())using(var w=new BinaryWriter(m)){foreach(uint n in new uint[]{0xFEEF04BD,0x10000,f[0],f[1],p[0],p[1],0x3F,0,0x40004,1,0,0,0})w.Write(n);fixedInfo=m.ToArray();}
        var fields=new Dictionary<string,string>{{"CompanyName",c.company??""},{"ProductName",c.product??c.appName},{"FileDescription",c.description??c.appName},{"LegalCopyright",c.copyright??""},{"FileVersion",c.fileVersion??"1.0.0.0"},{"ProductVersion",c.productVersion??"1.0.0.0"},{"OriginalFilename",Path.GetFileName(file)}};
        var strings=new List<byte[]>();foreach(var pair in fields){string text=pair.Value+"\0";strings.Add(Block(pair.Key,1,(ushort)text.Length,Encoding.Unicode.GetBytes(text)));}
        byte[] table=Block("040904B0",1,0,new byte[0],strings.ToArray());
        byte[] data=Block("VS_VERSION_INFO",0,(ushort)fixedInfo.Length,fixedInfo,Block("StringFileInfo",1,0,new byte[0],table),Block("VarFileInfo",1,0,new byte[0],Block("Translation",0,4,new byte[]{9,4,0xB0,4})));
        IntPtr h=BeginUpdateResource(file,false);if(h==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
        // Replace the vendor template's neutral resource, rather than adding a second language.
        bool done=false;try{if(!UpdateResource(h,new IntPtr(16),new IntPtr(1),0,data,(uint)data.Length))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());if(!EndUpdateResource(h,false))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());done=true;}finally{if(!done)EndUpdateResource(h,true);}
        if(overlay<original.Length){
            byte[] updated=File.ReadAllBytes(file);int next=OverlayStart(updated);
            // PB library node/data pointers are absolute file offsets. Never shift the overlay.
            int pe=BitConverter.ToInt32(original,60),newPe=BitConverter.ToInt32(updated,60);
            int count=BitConverter.ToUInt16(original,pe+6),section=pe+24+BitConverter.ToUInt16(original,pe+20),newSection=newPe+24+BitConverter.ToUInt16(updated,newPe+20);
            if(next>overlay||count!=BitConverter.ToUInt16(updated,newPe+6))throw new InvalidOperationException("Version information exceeds the PB executable template's reserved resource space. Shorten the version strings.");
            for(int i=0;i<count;i++){
                int a=section+i*40,b=newSection+i*40;
                int size=BitConverter.ToInt32(original,a+16);
                if(BitConverter.ToInt32(original,a+20)!=BitConverter.ToInt32(updated,b+20)||BitConverter.ToInt32(updated,b+16)>size)throw new InvalidOperationException("Resource update would move PB library data; output rejected.");
                Array.Copy(BitConverter.GetBytes(size),0,updated,b+16,4);
            }
            using(var stream=File.Open(file,FileMode.Create,FileAccess.Write)){stream.Write(updated,0,next);stream.SetLength(original.Length);stream.Position=overlay;stream.Write(original,overlay,original.Length-overlay);}
        }
    }
}
