'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const {runProject}=require('../dist/services/project-service');
test('PB8 builds an x86 EXE/PBD with a Chinese relative PBR resource', {skip:process.platform!=='win32'},()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pb-native-'));
 try{
  const base=path.join(root,'中文工程');fs.mkdirSync(base);
  const cli=path.resolve(__dirname,'../pb-cli.exe'),pbl=path.join(base,'smoke.pbl');
  const call=args=>execFileSync(cli,['--version=80',...args],{encoding:'utf8',windowsHide:true});
  call(['create-pbl',pbl]);
  const source=['$PBExportHeader$smoke.sra','forward','global type smoke from application','end type','end forward','global type smoke from application','string appname = "smoke"','end type','global smoke smoke','on smoke.create','end on','on smoke.destroy','end on',''].join('\r\n');
  const sra=path.join(base,'smoke.sra');fs.writeFileSync(sra,source,'utf8');call(['import',pbl,sra,'smoke']);
  fs.writeFileSync(path.join(base,'smoke.pbt'),'appname "smoke";\napplib "smoke.pbl";\nliblist "smoke.pbl";\n','utf8');
  const bmp=Buffer.alloc(58);bmp.write('BM');bmp.writeUInt32LE(58,2);bmp.writeUInt32LE(54,10);bmp.writeUInt32LE(40,14);bmp.writeInt32LE(1,18);bmp.writeInt32LE(1,22);bmp.writeUInt16LE(1,26);bmp.writeUInt16LE(24,28);bmp.writeUInt32LE(4,34);bmp[56]=255;
  fs.mkdirSync(path.join(base,'res'));fs.writeFileSync(path.join(base,'res','资源图.bmp'),bmp);
  fs.writeFileSync(path.join(base,'smoke.pbr'),'res\\资源图.bmp\r\n','utf8');
  const result=runProject(path.join(base,'smoke.pbt'),80,{runRoot:path.join(root,'logs')},'build');
  assert.equal(result.success,true,JSON.stringify(result));assert.equal(result.errors.length,0);assert.equal(result.artifacts.length,2);
  const exe=fs.readFileSync(result.exePath),pe=exe.readUInt32LE(60);assert.equal(exe.readUInt16LE(pe+4),0x14c);assert.ok(exe.includes(Buffer.from('PBVM80.dll')));
  assert.equal(fs.readdirSync(base).some(x=>x.startsWith('.pb-ai-resources-')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

