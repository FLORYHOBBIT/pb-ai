'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os');
const {resolveProject,prepareResources}=require('../dist/services/project-service');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pb-project-test-'));
 fs.writeFileSync(path.join(root,'app.pbl'),'fixture');fs.writeFileSync(path.join(root,'base.pbl'),'fixture');
 fs.writeFileSync(path.join(root,'app.pbt'),'appname "app";\napplib "app.pbl";\nliblist "app.pbl;base.pbl";\n','utf8');
 return root;
}
function withFixture(fn){const root=fixture();try{fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
test('PBL discovers its PBT; defaults keep ordered libraries and all PBD flags',()=>withFixture(root=>{
 const c=resolveProject(path.join(root,'app.pbl'),80);
 assert.equal(c.pbtPath,path.join(root,'app.pbt'));assert.deepEqual(c.libraries.map(x=>path.basename(x)),['app.pbl','base.pbl']);
 assert.deepEqual(c.pbdFlags,[1,1]);assert.equal(c.exePath,path.join(root,'app.exe'));assert.equal(c.pbrPath,null);
}));
test('invalid output directory falls back without creating the stale directory',()=>withFixture(root=>{
 const missing=path.join(root,'stale','bin');const c=resolveProject(path.join(root,'app.pbt'),80,{exePath:path.join(missing,'custom.exe')});
 assert.equal(c.exePath,path.join(root,'custom.exe'));assert.equal(fs.existsSync(missing),false);assert.equal(c.warnings.length,1);
}));
test('valid explicit output directory is preserved',()=>withFixture(root=>{
 const dest=path.join(root,'release');fs.mkdirSync(dest);
 assert.equal(resolveProject(path.join(root,'app.pbt'),80,{exePath:path.join(dest,'custom.exe')}).exePath,path.join(dest,'custom.exe'));
}));
test('stale PBL/PBR references fall back to same-named files in target directory',()=>withFixture(root=>{
 fs.writeFileSync(path.join(root,'app.pbt'),'appname "app";\napplib "stale\\app.pbl";\nliblist "stale\\app.pbl;stale\\base.pbl";','utf8');
 fs.writeFileSync(path.join(root,'app.pbr'),'图标.bmp\r\n','utf8');fs.writeFileSync(path.join(root,'图标.bmp'),'fixture');
 const c=resolveProject(path.join(root,'app.pbt'),80,{pbrPath:'old\\app.pbr'});
 assert.equal(c.libraries.length,2);assert.deepEqual(prepareResources(c).pbrLines,['图标.bmp']);
}));
test('missing dependencies and missing PBR contents fail instead of dropping files',()=>withFixture(root=>{
 fs.unlinkSync(path.join(root,'base.pbl'));assert.throws(()=>resolveProject(path.join(root,'app.pbt'),80),/PBL不存在/);
 fs.writeFileSync(path.join(root,'base.pbl'),'fixture');fs.writeFileSync(path.join(root,'app.pbr'),'missing.bmp','utf8');
 assert.throws(()=>prepareResources(resolveProject(path.join(root,'app.pbt'),80)),/PBR资源不存在/);
}));
test('mismatched PBD flags, conflicting app name and omitted version are rejected',()=>withFixture(root=>{
 assert.throws(()=>resolveProject(path.join(root,'app.pbt'),80,{pbdFlags:[1]}),/pbdFlags/);
 assert.throws(()=>resolveProject(path.join(root,'app.pbt'),80,{appName:'other'}),/appName/);
 assert.throws(()=>resolveProject(path.join(root,'app.pbt')),/pbVersion/);
}));

