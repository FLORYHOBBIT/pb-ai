"use strict";
const fs=require('fs'),path=require('path'),os=require('os');
const {execFileSync}=require('child_process');
const HOST=path.resolve(__dirname,'../..','pb-native-host.exe');
function call(args){
 let raw;
 try{raw=execFileSync(HOST,args,{encoding:'utf8',timeout:120000,maxBuffer:128*1024*1024,windowsHide:true});}
 catch(e){if(!e.stdout)throw e;raw=e.stdout;}
 const result=JSON.parse(raw.trim().replace(/^\uFEFF/,''));
 if(result.success===false&&!result.errors?.length)result.errors=[{level:2,messageText:result.error||'Native command failed',messageNumber:'',line:0,column:0,isError:true}];
 return result;
}
function importSourceViaNative(pblPath,srcFile,objectName,pbVersion,options={}){
 if(!Number.isInteger(pbVersion))throw new Error('导入必须指定实际 PB 版本');
 const library=path.resolve(pblPath),source=path.resolve(srcFile);
 const backup=fs.mkdtempSync(path.join(os.tmpdir(),'pb-ai-import-'));
 const saved=path.join(backup,path.basename(library));fs.copyFileSync(library,saved);
 try{
  const result=call([`--version=${pbVersion}`,...(options.pbtPath?[`--pbt=${path.resolve(options.pbtPath)}`]:[]),'import',library,source,objectName]);
  if(!result.success)fs.copyFileSync(saved,library);
  return {...result,backupDir:backup,errors:result.errors||[]};
 }catch(e){fs.copyFileSync(saved,library);throw e;}
}
function deleteObjectViaNative(pblPath,objectName,typeName,pbVersion){
 if(!Number.isInteger(pbVersion))throw new Error('删除对象必须指定实际 PB 版本');
 const library=path.resolve(pblPath),dir=fs.mkdtempSync(path.join(os.tmpdir(),'pb-ai-delete-')),saved=path.join(dir,path.basename(library));
 fs.copyFileSync(library,saved);
 try{const r=call([`--version=${pbVersion}`,'delete',library,objectName,typeName]);if(!r.success)fs.copyFileSync(saved,library);return {...r,backupDir:dir};}
 catch(e){fs.copyFileSync(saved,library);throw e;}
}
function createPblViaNative(pblPath,comment='',pbVersion=80){return call([`--version=${pbVersion}`,'create-pbl',path.resolve(pblPath),comment]);}
function deletePblViaNative(pblPath){
 const library=path.resolve(pblPath),dir=fs.mkdtempSync(path.join(os.tmpdir(),'pb-ai-delete-library-'));
 const saved=[library,library.replace(/\.pbl$/i,'.pbd')].filter(f=>fs.existsSync(f)).map(f=>({file:f,saved:path.join(dir,path.basename(f))}));
 for(const e of saved)fs.copyFileSync(e.file,e.saved);
 try{const r=call(['delete-pbl',library]);if(!r.success)for(const e of saved)fs.copyFileSync(e.saved,e.file);return {...r,backupDir:dir};}
 catch(e){for(const e of saved)fs.copyFileSync(e.saved,e.file);throw e;}
}
function createExeViaNative(pblPath,exePath,appName,options={},pbVersion){return require('./project-service').runProject(pblPath,pbVersion,{...options,exePath,appName},'build');}
module.exports={call,importSourceViaNative,deleteObjectViaNative,createPblViaNative,deletePblViaNative,createExeViaNative};
