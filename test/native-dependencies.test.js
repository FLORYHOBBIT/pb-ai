'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const service=require('../dist/services/pbl-service');
const {runProject}=require('../dist/services/project-service');
function app(){return ['$PBExportHeader$app.sra','forward','global type app from application','end type','end forward','global type app from application','string appname = "app"','end type','global app app','on app.create','end on','on app.destroy','end on',''].join('\r\n');}
function object(name,base){return [`$PBExportHeader$${name}.sru`,'forward',`global type ${name} from ${base}`,'end type','end forward',`global type ${name} from ${base}`,'end type',`global ${name} ${name}`,`on ${name}.create`,'call super::create','end on',`on ${name}.destroy`,'call super::destroy','end on',''].join('\r\n');}
test('cross-library rebuild emits progress once and restores PBLs when a dependency is removed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pb-dependencies-'));
 const appLib=path.join(root,'app.pbl'),baseLib=path.join(root,'base.pbl'),pbt=path.join(root,'app.pbt');
 try{
  service.createLibrary(appLib,'',80);service.createLibrary(baseLib,'',80);
  fs.writeFileSync(path.join(root,'app.sra'),app(),'utf8');service.importSource(appLib,'app','',path.join(root,'app.sra'),80);
  fs.writeFileSync(pbt,'appname "app";\napplib "app.pbl";\nliblist "app.pbl;base.pbl";','utf8');
  fs.writeFileSync(path.join(root,'n_base.sru'),object('n_base','nonvisualobject'),'utf8');service.importSource(baseLib,'n_base','',path.join(root,'n_base.sru'),80);
  fs.writeFileSync(path.join(root,'n_child.sru'),object('n_child','n_base'),'utf8');service.importSource(appLib,'n_child','',path.join(root,'n_child.sru'),80);
  const success=runProject(pbt,80,{},'compile');assert.equal(success.success,true,JSON.stringify(success));
  const events=fs.readFileSync(path.join(success.runDir,'progress.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(events.filter(e=>e.stage==='full-rebuild').length,1);assert.equal(events.some(e=>e.name==='n_base.sru'&&e.library===baseLib),true);
  fs.writeFileSync(pbt,'appname "app";\napplib "app.pbl";\nliblist "app.pbl";','utf8');
  const before=fs.readFileSync(appLib),failed=runProject(pbt,80,{},'compile');
  assert.equal(failed.success,false);assert.equal(failed.rolledBack,true);assert.ok(failed.errors.length>0);assert.deepEqual(fs.readFileSync(appLib),before);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
