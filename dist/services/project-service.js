'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const {execFileSync}=require('child_process');
const PACKAGE=path.resolve(__dirname,'../..'),CLI=path.join(PACKAGE,'pb-cli.exe'),BRIDGE=path.join(PACKAGE,'pb-project-build.exe');
function exists(file){try{return fs.statSync(file).isFile();}catch{return false;}}
function directory(file){try{return fs.statSync(file).isDirectory();}catch{return false;}}
// UTF-8 first; legacy PB8 exports/PBRs are explicitly decoded without changing the originals.
function readText(file){const b=fs.readFileSync(file);try{return new TextDecoder('utf-8',{fatal:true}).decode(b);}catch{return new TextDecoder(b[0]===255&&b[1]===254?'utf-16le':'gb18030',{fatal:true}).decode(b);}}
function clean(value){return value.trim().replace(/^"|"$/g,'').replace(/\\\\/g,'\\');}
function unique(values){return [...new Map(values.map(x=>[x.toLowerCase(),x])).values()];}
function inputPath(raw,base,kind,warnings){
 const requested=path.resolve(base,clean(raw));if(exists(requested))return requested;
 const fallback=path.join(base,path.basename(clean(raw)));
 if(exists(fallback)){warnings.push(`${kind}路径回落：${requested} -> ${fallback}`);return fallback;}
 throw new Error(`${kind}不存在：${requested}；当前工程目录也未找到同名文件`);
}
function outputPath(raw,base,defaultName,warnings){
 const requested=path.resolve(base,clean(raw||defaultName));if(directory(path.dirname(requested)))return requested;
 const fallback=path.join(base,path.basename(requested));warnings.push(`EXE目录无效，回落：${requested} -> ${fallback}`);return fallback;
}
function defaultExePath(base,appName){
 const applicationDir=path.join(path.dirname(base),appName);
 return path.join(directory(applicationDir)?applicationDir:base,appName+'.exe');
}
function pbtFields(file){
 const text=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
 const get=key=>{const m=text.match(new RegExp('(?:^|\\n)\\s*'+key+'\\s+"([^"]*)"','i'));return m&&m[1];};
 const appName=get('appname'),appLibrary=get('applib'),libraries=get('liblist');
 if(!appName||!appLibrary||!libraries)throw new Error(`PBT缺少 appname/applib/liblist：${file}`);
 return {appName,appLibrary,libraries:libraries.split(';').filter(x=>x.trim())};
}
function discoverPbt(file,explicit){
 if(explicit){const p=path.resolve(explicit);if(!exists(p))throw new Error(`PBT不存在：${p}`);return p;}
 if(path.extname(file).toLowerCase()==='.pbt')return file;
 const same=file.replace(/\.pbl$/i,'.pbt');if(exists(same))return same;
 const base=path.dirname(file);
 const matches=fs.readdirSync(base).filter(x=>/\.pbt$/i.test(x)).map(x=>path.join(base,x)).filter(x=>{
  try{return pbtFields(x).libraries.some(lib=>path.resolve(base,clean(lib)).toLowerCase()===file.toLowerCase());}catch{return false;}
 });
 if(matches.length>1)throw new Error(`此PBL被多个工程引用，请指定 pbtPath：${matches.join('; ')}`);
 return matches[0]||null;
}
function resourceLines(file,base,libraries,warnings){
 if(!file)return [];
 return readText(file).split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('//')).map(line=>{
  const dw=line.match(/^(.*?)\(([^()]*)\)\s*$/);
  if(dw){
   const named=libraries.filter(x=>path.basename(x).toLowerCase()===path.basename(clean(dw[1])).toLowerCase());
   const lib=exists(path.resolve(base,clean(dw[1])))?path.resolve(base,clean(dw[1])):named.length===1?named[0]:inputPath(dw[1],base,'PBR库引用',warnings);
   return `${path.relative(base,lib)}(${dw[2]})`;
  }
  const value=clean(line);if(exists(path.resolve(base,value)))return value;
  const fallback=unique([path.resolve(path.dirname(file),value),path.join(base,path.basename(value))]).find(exists);
  if(!fallback)throw new Error(`PBR资源不存在：${line}（${file}）`);
  warnings.push(`PBR资源路径回落：${line} -> ${fallback}`);return path.relative(base,fallback);
 });
}
function resolveProject(input,version,options={}){
 if(!Number.isInteger(version))throw new Error('必须显式指定 pbVersion，不能通过 ANSI 文件头推断 PB8/PB9');
 const file=path.resolve(input),warnings=[];if(!exists(file))throw new Error(`工程文件不存在：${file}`);
 const pbt=discoverPbt(file,options.pbtPath),baseDir=path.dirname(pbt||file);
 let libraries,appLibrary,appName;
 if(pbt){
  const target=pbtFields(pbt);libraries=unique(target.libraries.map(x=>inputPath(x,baseDir,'PBL',warnings)));
  appLibrary=inputPath(target.appLibrary,baseDir,'应用库',warnings);appName=target.appName;
 }else{
  libraries=unique([file,...(options.libraryList||[]).map(x=>inputPath(x,baseDir,'PBL',warnings))]);appLibrary=file;
  const apps=JSON.parse(execFileSync(CLI,[`--version=${version}`,'list',file,'Application'],{encoding:'utf8',timeout:120000}).trim()).filter(x=>x.typeName==='Application');
  if(apps.length!==1&&!options.appName)throw new Error('未找到唯一应用对象，请传入 PBT 或 appName/libraryList');
  appName=options.appName||apps[0].name;
 }
 if(!libraries.some(x=>x.toLowerCase()===appLibrary.toLowerCase()))throw new Error('应用库不在PBT库列表中');
 if(options.appName&&options.appName.toLowerCase()!==appName.toLowerCase())throw new Error('appName与PBT应用对象不一致');
 const exePath=options.exePath?outputPath(options.exePath,baseDir,appName+'.exe',warnings):defaultExePath(baseDir,appName),defaultPbr=path.join(baseDir,appName+'.pbr');
 const pbrPath=options.pbrPath?inputPath(options.pbrPath,baseDir,'PBR',warnings):exists(defaultPbr)?defaultPbr:null;
 const iconPath=options.iconPath?inputPath(options.iconPath,baseDir,'图标',warnings):[path.join(baseDir,'res',appName+'.ico'),path.join(baseDir,appName+'.ico')].find(exists)||null;
 const pbdFlags=options.pbdFlags||libraries.map(()=>1);
 if(pbdFlags.length!==libraries.length||pbdFlags.some(x=>x!==0&&x!==1))throw new Error('pbdFlags必须与库列表一一对应且值为0/1');
 const names=libraries.filter((_,i)=>pbdFlags[i]).map(x=>path.basename(x).toLowerCase());
 if(new Set(names).size!==names.length)throw new Error('PBD存在同名库，不能安全汇集到EXE目录');
 return {...options,pbVersion:version,pbtPath:pbt,baseDir,appName,appLibrary,libraries,exePath,iconPath,pbrPath,pbdFlags,warnings};
}
function prepareResources(c){return {
 pbrLines:resourceLines(c.pbrPath,c.baseDir,c.libraries,c.warnings),
 libraryPbrLines:c.libraries.map((_,i)=>{const raw=c.libraryPbrPaths&&c.libraryPbrPaths[i];return raw?resourceLines(inputPath(raw,c.baseDir,'PBD资源文件',c.warnings),c.baseDir,c.libraries,c.warnings):[];})
};}
function backupFiles(files,runDir){
 const manifest=[];
 for(const [i,file] of unique(files).entries()){
  const existed=exists(file),saved=path.join(runDir,'backup',String(i).padStart(4,'0')+'-'+path.basename(file));
  if(existed){fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(file,saved);}
  manifest.push({file,existed,saved:existed?saved:null});
 }
 fs.writeFileSync(path.join(runDir,'backup.json'),JSON.stringify(manifest,null,2),'utf8');return manifest;
}
function restoreFiles(manifest){for(const e of manifest){if(e.existed)fs.copyFileSync(e.saved,e.file);else if(exists(e.file))fs.unlinkSync(e.file);}}
function runProject(input,version,options={},action='compile'){
 const config=resolveProject(input,version,options),resources=action==='build'?prepareResources(config):{pbrLines:[],libraryPbrLines:[]};
 if(!exists(BRIDGE))throw new Error(`编译桥不存在：${BRIDGE}`);
 const runRoot=options.runRoot||path.join(os.tmpdir(),'pb-ai-mcp-builds');fs.mkdirSync(runRoot,{recursive:true});
 const runDir=fs.mkdtempSync(path.join(runRoot,config.appName+'-')),lock=path.join(config.baseDir,'.pb-ai-mcp-build.lock');let fd;
 try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,runDir}));}catch{throw new Error(`工程已有构建锁：${lock}；确认没有构建进程后再处理遗留锁`);}
 let manifest=[],result;
 const outputs=action==='build'?config.libraries.filter((_,i)=>config.pbdFlags[i]).flatMap(lib=>[lib.replace(/\.pbl$/i,'.pbd'),path.join(path.dirname(config.exePath),path.basename(lib).replace(/\.pbl$/i,'.pbd'))]).concat(config.exePath):[];
 try{
  manifest=backupFiles([...config.libraries,...outputs],runDir);
  const request={...config,...resources,action,logPath:path.join(runDir,'progress.jsonl')},requestPath=path.join(runDir,'request.json');
  fs.writeFileSync(requestPath,JSON.stringify(request,null,2),'utf8');let raw;
  try{raw=execFileSync(BRIDGE,[requestPath],{encoding:'utf8',cwd:config.baseDir,timeout:options.timeoutMs||1800000,maxBuffer:64*1024*1024,windowsHide:true});}catch(e){if(e.stdout)raw=e.stdout;else throw e;}
  fs.writeFileSync(path.join(runDir,'native-result.json'),raw,'utf8');result=JSON.parse(raw.trim().replace(/^\uFEFF/,''));
  if(result.success&&action==='build')for(const lib of config.libraries.filter((_,i)=>config.pbdFlags[i])){
   const source=lib.replace(/\.pbl$/i,'.pbd'),dest=path.join(path.dirname(config.exePath),path.basename(source));
   if(source.toLowerCase()!==dest.toLowerCase()){fs.copyFileSync(source,dest);result.artifacts.push(dest);}
  }
  if(!result.success){restoreFiles(manifest);result.rolledBack=true;}
  result={...result,libraryCount:config.libraries.length,appName:config.appName,pbtPath:config.pbtPath,runDir,warnings:config.warnings};
  result.errors=(result.diagnostics||[]).filter(x=>x.isError);result.information=(result.diagnostics||[]).filter(x=>!x.isError);result.output=result.error||'';
  fs.writeFileSync(path.join(runDir,'result.json'),JSON.stringify(result,null,2),'utf8');return result;
 }catch(e){if(manifest.length)restoreFiles(manifest);throw new Error(`构建失败，已恢复备份。日志：${runDir}\n${e.message}`);}
 finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
module.exports={resolveProject,runProject,readText,resourceLines,prepareResources};

