'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');
const service=require('../dist/services/pbl-service');
const root=path.resolve(__dirname,'..');
function call(args){return JSON.parse(execFileSync(path.join(root,'pb-native-host.exe'),args,{encoding:'utf8',windowsHide:true}));}
function app(name){return ['$PBExportHeader$'+name+'.sra','forward','global type '+name+' from application','end type','end forward','global type '+name+' from application','string appname = "'+name+'"','end type','global '+name+' '+name,'on '+name+'.create','end on','on '+name+'.destroy','end on',''].join('\r\n');}
test('native backend creates, imports, lists, exports, syncs, rejects bad edits, and deletes PB8 objects',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pb-library-')),pbl=path.join(dir,'demo.pbl');
 try{
  service.createLibrary(pbl,'中文注释',80);
  const src=path.join(dir,'demo.sra');fs.writeFileSync(src,app('demo'),'utf8');
  service.importSource(pbl,'demo','',src,80);
  assert.equal(service.listObjects(pbl).some(e=>e.name==='demo'),true);
  const exported=service.exportSourceToFile(pbl,'demo',path.join(dir,'export'));
  assert.match(fs.readFileSync(exported.filePath,'utf8'),/global type demo from application/i);
  const all=service.exportAllSource(pbl,path.join(dir,'all'));assert.equal(all.exported.length,1);
  const first=service.syncAllSource(pbl,dir),second=service.syncAllSource(pbl,dir);
  assert.equal(first.synced.length,1);assert.equal(second.skipped,1);assert.equal(second.synced.length,0);
  const local=path.join(first.syncDir,'demo.sra');fs.writeFileSync(local,'local edit','utf8');
  const protectedSync=service.syncAllSource(pbl,path.join(dir,'pb_ai_src'));assert.equal(protectedSync.syncDir,first.syncDir);assert.equal(fs.readFileSync(local,'utf8'),'local edit');
  const before=fs.readFileSync(pbl);fs.writeFileSync(src,app('demo').replace('string appname = "demo"','this is not valid powerscript'),'utf8');
  assert.throws(()=>service.importSource(pbl,'demo','',src,80),/导入失败/);assert.deepEqual(fs.readFileSync(pbl),before);
  service.deleteObject(pbl,'demo',80);assert.equal(service.listObjects(pbl).length,0);
  service.deleteLibrary(pbl);assert.equal(fs.existsSync(pbl),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('native command reports missing source and runtime with a nonzero exit',()=>{
 assert.throws(()=>call(['--version=80','--runtime-dir=C:\\__pb_ai_missing__','list',path.join(root,'package.json')]));
});
module.exports={app};
