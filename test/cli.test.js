'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {execFileSync}=require('child_process'),path=require('path');
const {parse}=require('../dist/cli');

test('CLI rejects missing and invalid version arguments',()=>{
 for(const args of [[],['--pb-version','0'],['--exe','--pb-version','80']]){
  assert.throws(()=>parse(['build','demo.pbt',...args]));
 }
});

test('CLI parses build options independently from MCP',()=>{
 const result=parse(['build','demo.pbt','--pb-version','80','--exe','out/demo.exe','--quiet']);
 assert.equal(result.action,'build');
 assert.equal(result.pbVersion,80);
 assert.equal(result.options.exePath,'out/demo.exe');
 assert.equal(result.quiet,true);
});

test('CLI help is executable',()=>{
 const output=execFileSync(process.execPath,[path.resolve(__dirname,'../dist/cli.js'),'--help'],{encoding:'utf8'});
 assert.match(output,/pb-build/);
 assert.match(output,/compile/);
 assert.match(output,/build/);
});
