/* MIT - pb-ai native ORCA adapter. No PBSpy code or binaries are used.
 * Build as x86 C. PB vendor runtime/ORCA DLLs are supplied by the installation.
 * One version/session operation per host process; callbacks run synchronously.
 */
#include <windows.h>
#include <stdio.h>
#include <string.h>
#define API __declspec(dllexport)
#define CALL __stdcall
typedef void (CALL *CBPROC)(void *,void *);
typedef void (CALL *PROGRESS)(int,const char *,const char *,void *);
typedef struct CM_PROGRESS CM_PROGRESS;
typedef int (CALL *CM_CALLBACK)(CM_PROGRESS *);
struct CM_PROGRESS { DWORD reserved[2]; CM_CALLBACK callback; int phase; const char *object; const char *library; };
typedef int (CALL *CM_REBUILD)(void *,int,CM_PROGRESS *,int *);
static HMODULE orca;
static int version;
static char last_error[512];
static PROGRESS progress;
static void *progress_user;
static CM_REBUILD original_cm;
static CM_CALLBACK original_callback;
static FARPROC *cm_slot;
static DWORD owner_thread;
static int progress_available;
/* PB8 8.0.2.9506 object writer configuration, verified against vendor code. */
typedef struct OB_PROGRESS OB_PROGRESS;
typedef int (CALL *OB_CALLBACK)(OB_PROGRESS *);
struct OB_PROGRESS { DWORD reserved[16]; int phase; const char *object; const char *library; OB_CALLBACK callback; };
typedef int (CALL *OB_LIBRARY)(void *,OB_PROGRESS *);
typedef int (CALL *OB_EXE)(void *,OB_PROGRESS *,void *);
static FARPROC *write_library_slot,*write_exe_slot;
static OB_LIBRARY original_library;
static OB_EXE original_exe;
static OB_CALLBACK original_writer_callback;

static FARPROC fn(const char *name) { FARPROC p=orca?GetProcAddress(orca,name):NULL; if(!p)snprintf(last_error,sizeof(last_error),"Missing vendor ORCA export: %s",name); return p; }
API const char *CALL pb_error(void) {return last_error;}
static int supported_compiler(const wchar_t *path) {
 DWORD dummy=0,size=GetFileVersionInfoSizeW(path,&dummy); BYTE *data; VS_FIXEDFILEINFO *info; UINT n; int ok=0;
 if(!size)return 0;data=(BYTE*)HeapAlloc(GetProcessHeap(),0,size);if(!data)return 0;
 if(GetFileVersionInfoW(path,0,size,data)&&VerQueryValueW(data,L"\\",(void**)&info,&n)&&n>=sizeof(*info))
  ok=info->dwFileVersionMS==0x00080000&&info->dwFileVersionLS==0x00022522;
 HeapFree(GetProcessHeap(),0,data);return ok;
}
static FARPROC *find_import(HMODULE module,const char *runtime,const char *name) {
 FARPROC target=GetProcAddress(GetModuleHandleA(runtime),name);
 BYTE *b=(BYTE*)module; IMAGE_DOS_HEADER *dos=(IMAGE_DOS_HEADER*)b; IMAGE_NT_HEADERS32 *nt; IMAGE_IMPORT_DESCRIPTOR *d;
 if(!module)return NULL;
 if(dos->e_magic!=IMAGE_DOS_SIGNATURE)return NULL;nt=(IMAGE_NT_HEADERS32*)(b+dos->e_lfanew);
 if(nt->Signature!=IMAGE_NT_SIGNATURE||nt->OptionalHeader.Magic!=IMAGE_NT_OPTIONAL_HDR32_MAGIC)return NULL;
 if(!nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT].VirtualAddress)return NULL;
 d=(IMAGE_IMPORT_DESCRIPTOR*)(b+nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT].VirtualAddress);
 for(;d->Name;d++) {
  IMAGE_THUNK_DATA32 *names,*slots;
  if(!d->OriginalFirstThunk)continue;
  names=(IMAGE_THUNK_DATA32*)(b+d->OriginalFirstThunk);slots=(IMAGE_THUNK_DATA32*)(b+d->FirstThunk);
  for(;names->u1.AddressOfData;names++,slots++) {
   if(target&&(FARPROC)slots->u1.Function==target)return (FARPROC*)&slots->u1.Function;
   if(names->u1.Ordinal&IMAGE_ORDINAL_FLAG32)continue;
   IMAGE_IMPORT_BY_NAME *entry=(IMAGE_IMPORT_BY_NAME*)(b+names->u1.AddressOfData);
   if(!strcmp((char*)entry->Name,name))return (FARPROC*)&slots->u1.Function;
  }
 }
 return NULL;
}
API int CALL pb_load(int requested,const wchar_t *directory) {
 wchar_t path[32768]; typedef BOOL (WINAPI *SETDIR)(LPCWSTR); SETDIR setdir;
 if(orca)return version==requested?0:-1;
 if(sizeof(void*)!=4)return -1;
 version=requested;last_error[0]=0;
 setdir=(SETDIR)GetProcAddress(GetModuleHandleA("kernel32.dll"),"SetDllDirectoryW");
 if(!setdir||!setdir(directory)){snprintf(last_error,sizeof(last_error),"Cannot configure runtime directory (%lu)",GetLastError());return -1;}
 if(wcslen(directory)>32000)return -1;
 if(requested==50)swprintf(path,L"%ls\\pborc050.dll",directory);
 else swprintf(path,L"%ls\\pborc%d.dll",directory,requested);
 orca=LoadLibraryW(path);
 if(!orca){snprintf(last_error,sizeof(last_error),"Cannot load vendor ORCA DLL for PB%d (Win32=%lu)",requested,GetLastError());return -1;}
 if(GetProcAddress(orca,"PBORCA_SessionOpenWithVersion")){strcpy(last_error,"A replacement ORCA DLL was detected. Supply the original vendor ORCA DLL, not PBSpy.");return -1;}
 if(!fn("PBORCA_SessionOpen"))return -1;
 if(requested==80) {
  swprintf(path,L"%ls\\pbcmp80.dll",directory);
  if(supported_compiler(path))cm_slot=find_import(orca,"pbcmp80.dll","cm_rebuild_application");
  progress_available=cm_slot!=NULL;
  swprintf(path,L"%ls\\pbvm80.dll",directory);
  if(supported_compiler(path)) {
   swprintf(path,L"%ls\\pblib80.dll",directory);
   if(supported_compiler(path)) {
    write_library_slot=find_import(GetModuleHandleA("pblib80.dll"),"pbvm80.dll","ob_create_library");
    write_exe_slot=find_import(orca,"pbvm80.dll","ob_create_executable");
   }
  }
 }
 return 0;
}
API int CALL pb_progress_supported(void) {return progress_available;}
API void CALL pb_set_progress(PROGRESS callback,void *user) {progress=callback;progress_user=user;}
static int CALL on_cm_progress(CM_PROGRESS *p) {
 if(progress)progress(p->phase,p->object,p->library,progress_user);
 return original_callback?original_callback(p):1;
}
static int CALL observe_rebuild(void *context,int mode,CM_PROGRESS *p,int *status) {
 CM_CALLBACK saved; int rc;
 if(!p||GetCurrentThreadId()!=owner_thread)return original_cm(context,mode,p,status);
 saved=p->callback;original_callback=saved;p->callback=on_cm_progress;
 rc=original_cm(context,mode,p,status);
 p->callback=saved;original_callback=NULL;return rc;
}
API int CALL pb_rebuild(void *session,int mode,CBPROC callback,void *user) {
 typedef int (CALL *F)(void*,int,CBPROC,void*); F f=(F)fn("PBORCA_ApplicationRebuild"); DWORD old,ignore; int rc,patched=0;
 if(!f)return -1;
 if(progress&&cm_slot&&VirtualProtect(cm_slot,sizeof(*cm_slot),PAGE_READWRITE,&old)) {
  original_cm=(CM_REBUILD)*cm_slot;owner_thread=GetCurrentThreadId();*cm_slot=(FARPROC)observe_rebuild;
  VirtualProtect(cm_slot,sizeof(*cm_slot),old,&ignore);patched=1;
 }
 if(progress&&progress_available&&!patched){strcpy(last_error,"Cannot install progress adapter");return -1;}
 rc=f(session,mode,callback,user);
 if(patched) {
  if(!VirtualProtect(cm_slot,sizeof(*cm_slot),PAGE_READWRITE,&old)){strcpy(last_error,"Cannot restore progress adapter");return -1;}
  *cm_slot=(FARPROC)original_cm;VirtualProtect(cm_slot,sizeof(*cm_slot),old,&ignore);
 }
 return rc;
}
API void *CALL pb_open(void) {typedef void*(CALL *F)(void);F f=(F)fn("PBORCA_SessionOpen");return f?f():NULL;}
API void CALL pb_close(void *s) {typedef void(CALL *F)(void*);F f=(F)fn("PBORCA_SessionClose");if(f&&s)f(s);}
#define WRAP(name,symbol,signature,types,args) API int CALL name signature {typedef int(CALL *F)types;F proc=(F)fn(symbol);return proc?proc args:-1;}
WRAP(pb_libraries,"PBORCA_SessionSetLibraryList",(void*s,void*n,int c),(void*,void*,int),(s,n,c))
WRAP(pb_application,"PBORCA_SessionSetCurrentAppl",(void*s,void*l,void*n),(void*,void*,void*),(s,l,n))
WRAP(pb_session_error,"PBORCA_SessionGetError",(void*s,void*b,int n),(void*,void*,int),(s,b,n))
WRAP(pb_create_library,"PBORCA_LibraryCreate",(void*s,void*l,void*c),(void*,void*,void*),(s,l,c))
WRAP(pb_delete_library,"PBORCA_LibraryDelete",(void*s,void*l),(void*,void*),(s,l))
WRAP(pb_delete_entry,"PBORCA_LibraryEntryDelete",(void*s,void*l,void*n,int t),(void*,void*,void*,int),(s,l,n,t))
WRAP(pb_directory,"PBORCA_LibraryDirectory",(void*s,void*l,void*c,int z,CBPROC cb,void*u),(void*,void*,void*,int,CBPROC,void*),(s,l,c,z,cb,u))
WRAP(pb_entry_info,"PBORCA_LibraryEntryInformation",(void*s,void*l,void*n,int t,void*i),(void*,void*,void*,int,void*),(s,l,n,t,i))
WRAP(pb_export,"PBORCA_LibraryEntryExport",(void*s,void*l,void*n,int t,void*b,long z),(void*,void*,void*,int,void*,long),(s,l,n,t,b,z))
WRAP(pb_import,"PBORCA_CompileEntryImport",(void*s,void*l,void*n,int t,void*c,void*b,long z,CBPROC cb,void*u),(void*,void*,void*,int,void*,void*,long,CBPROC,void*),(s,l,n,t,c,b,z,cb,u))
WRAP(pb_regenerate,"PBORCA_CompileEntryRegenerate",(void*s,void*l,void*n,int t,CBPROC cb,void*u),(void*,void*,void*,int,CBPROC,void*),(s,l,n,t,cb,u))
/* Observe actual writer callbacks only while the vendor packaging call runs. */
static int CALL on_write_progress(OB_PROGRESS *p) {
 if(progress && p->phase==1 && p->object && p->library)
  progress(100+p->phase,p->object,p->library,progress_user);
 return original_writer_callback?original_writer_callback(p):1;
}
static int CALL observe_library(void *context,OB_PROGRESS *p) {
 OB_CALLBACK saved,outer;int rc;
 if(!p||GetCurrentThreadId()!=owner_thread)return original_library(context,p);
 saved=p->callback;outer=original_writer_callback;original_writer_callback=saved;p->callback=on_write_progress;
 rc=original_library(context,p);p->callback=saved;original_writer_callback=outer;return rc;
}
static int CALL observe_exe(void *context,OB_PROGRESS *p,void *extra) {
 OB_CALLBACK saved,outer;int rc;
 if(!p||GetCurrentThreadId()!=owner_thread)return original_exe(context,p,extra);
 saved=p->callback;outer=original_writer_callback;original_writer_callback=saved;p->callback=on_write_progress;
 rc=original_exe(context,p,extra);p->callback=saved;original_writer_callback=outer;return rc;
}
static int replace_slot(FARPROC *slot,FARPROC replacement,FARPROC *saved) {
 DWORD old,ignore;
 if(!VirtualProtect(slot,sizeof(*slot),PAGE_READWRITE,&old)){strcpy(last_error,"Cannot update writer progress adapter");return 0;}
 if(saved)*saved=*slot;
 *slot=replacement;VirtualProtect(slot,sizeof(*slot),old,&ignore);return 1;
}
API int CALL pb_pbd(void*s,void*l,void*r,int flags) {
 typedef int(CALL *F)(void*,void*,void*,int);F f=(F)fn("PBORCA_DynamicLibraryCreate");int rc,patched=0;
 if(!f)return -1;
 if(progress&&write_library_slot){owner_thread=GetCurrentThreadId();patched=replace_slot(write_library_slot,(FARPROC)observe_library,(FARPROC*)&original_library);if(!patched)return -1;}
 rc=f(s,l,r,flags);
 if(patched&&!replace_slot(write_library_slot,(FARPROC)original_library,NULL))return -1;
 return rc;
}
API int CALL pb_exe(void*s,void*e,void*i,void*r,CBPROC cb,void*u,void*flags,int n,int c) {
 typedef int(CALL *F)(void*,void*,void*,void*,CBPROC,void*,void*,int,int);F f=(F)fn("PBORCA_ExecutableCreate");int rc,patched=0;
 if(!f)return -1;
 if(progress&&write_exe_slot){owner_thread=GetCurrentThreadId();patched=replace_slot(write_exe_slot,(FARPROC)observe_exe,(FARPROC*)&original_exe);if(!patched)return -1;}
 rc=f(s,e,i,r,cb,u,flags,n,c);
 if(patched&&!replace_slot(write_exe_slot,(FARPROC)original_exe,NULL))return -1;
 return rc;
}
