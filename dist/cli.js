#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),os=require('os');
const {spawn}=require('child_process');
const {StringDecoder}=require('string_decoder');
const {runProject}=require('./services/project-service');

const usage=`pb-build - PowerBuilder 工程编译工具

用法:
  pb-build compile <PBT或PBL> --pb-version <版本>
  pb-build build   <PBT或PBL> --pb-version <版本>

选项:
  --exe <路径>       指定生成的 EXE 路径
  --output-dir <目录> 编译成功后额外复制 EXE/PBD 到该目录（不存在则创建）
  --pbr <路径>       指定 PBR 文件
  --icon <路径>      指定图标文件
  --quiet            不显示逐条编译消息
  --runtime-dir <目录> 指定本机 PB 原生运行库目录（也可设置 PB_RUNTIME_DIR）
  --trace-objects    兼容参数：对象进度已默认开启，不再额外预编译
  -h, --help         显示帮助

示例:
  pb-build build "E:\\job\\source_gzjszyy\\Zhis4\\doctor.pbt" --pb-version 80`;

function parse(argv){
 if(argv.includes('-h')||argv.includes('--help'))return {help:true};
 const action=argv.shift(),input=argv.shift();
 if(!['compile','build'].includes(action)||!input)throw new Error('必须指定 compile/build 和 PBT/PBL 路径');
 const result={action,input,options:{},quiet:false};
 const flags={'--pb-version':'pbVersion','--exe':'exePath','--pbr':'pbrPath','--icon':'iconPath','--output-dir':'outputDir','--runtime-dir':'runtimeDir'};
 while(argv.length){
  const flag=argv.shift();
  if(flag==='--trace-objects'){result.options.traceObjects=true;continue;}
  if(flag==='--quiet'){result.quiet=true;continue;}
  const key=flags[flag];if(!key||!argv.length||argv[0].startsWith('--'))throw new Error(`未知或缺少参数：${flag}`);
  result[key]=argv.shift();
 }
 result.pbVersion=Number(result.pbVersion);
 if(!Number.isInteger(result.pbVersion)||result.pbVersion<=0)throw new Error('--pb-version 必须是正整数，例如 80');
 for(const key of ['exePath','pbrPath','iconPath','outputDir','runtimeDir'])if(result[key])result.options[key]=result[key];
 if(action==='compile'&&result.options.outputDir)throw new Error('--output-dir 仅用于 build');
 return result;
}

function worker(encoded){
 try{
  const request=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
  const result=runProject(request.input,request.pbVersion,{...request.options,runRoot:request.runRoot},request.action);
  process.stdout.write(JSON.stringify({ok:true,result}));process.exitCode=result.success?0:1;
 }catch(error){process.stdout.write(JSON.stringify({ok:false,error:error.stack||error.message}));process.exitCode=1;}
}

const stageNames={
 'open-session':'Open PowerBuilder session','set-library-list':'Load project libraries','set-application':'Set application',
 'full-rebuild':'Full rebuild','set-exe-info':'Write EXE version information','create-exe':'Generate EXE','complete':'Build complete'
};
function show(event,quiet){
 if(event.objectEvent){
  if(event.objectEvent==='writing'){if(!quiet)console.log(`Writing ${event.library}(${event.name.replace(/\.(apl|dwo|udo|win|fun|str|men|bin)$/i,'')}) . . .`);return;}
  if(event.objectEvent==='progress'){
   const label=({1:'Building type',2:'Building type',3:'Building type',4:'Regenerating'})[event.phase]||`Processing (phase ${event.phase})`;
   if(!quiet)console.log(`${label} ${event.library}(${event.name}) . . .`);return;
  }
  if(event.objectEvent==='start')console.log(`[Object ${event.index}/${event.total}] ${event.library} :: ${event.name}`);
  else if(event.returnCode!==0)console.error(`[Compile error] ${event.library} :: ${event.name}, return code=${event.returnCode}`);
  return;
 }
 if(event.stage){
  const label=event.stage.startsWith('create-pbd: ')?`Generate PBD: ${path.basename(event.stage.slice(12))}`:(stageNames[event.stage]||event.stage);
  console.log(`[Status] ${label}`);return;
 }
 if(event.linkMessage){console.log(`[Link] ${event.linkMessage}`);return;}
 if(event.messageText&&(!quiet||event.isError)){
  const where=event.line?` (${event.line}:${event.column||0})`:'';
  console.log(`[${event.isError?'Error':'Compile'}] ${event.messageNumber||''} ${event.messageText}${where}`.trim());
 }
}

function main(argv){
 let request;try{request=parse([...argv]);}catch(error){console.error(error.message+'\n\n'+usage);return 2;}
 if(request.help){console.log(usage);return 0;}
 request.input=path.resolve(request.input);
 request.runRoot=fs.mkdtempSync(path.join(os.tmpdir(),'pb-build-cli-'));
 console.log(`[Log root] ${request.runRoot}`);

 console.log(`[Start] ${request.action==='build'?'Compile and generate EXE/PBD':'Compile only'}: ${request.input}`);
 const encoded=Buffer.from(JSON.stringify(request),'utf8').toString('base64');
 const child=spawn(process.execPath,[__filename,'--worker',encoded],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='',logFile=null,logOffset=0,pending='';const decoder=new StringDecoder('utf8');
 const started=Date.now();let lastEvent=Date.now(),current='Prepare project';
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
 child.on('error',error=>{stderr+=error.message;});
 function tail(){
  if(!logFile){
   const dirs=fs.readdirSync(request.runRoot,{withFileTypes:true}).filter(x=>x.isDirectory());
   if(dirs.length)logFile=path.join(request.runRoot,dirs[0].name,'progress.jsonl');
  }
  if(!logFile||!fs.existsSync(logFile))return;
  let fd;try{
   fd=fs.openSync(logFile,'r');const size=fs.fstatSync(fd).size;
   while(logOffset<size){
    const buffer=Buffer.alloc(Math.min(size-logOffset,256*1024));const count=fs.readSync(fd,buffer,0,buffer.length,logOffset);if(!count)break;
    logOffset+=count;pending+=decoder.write(buffer.subarray(0,count));const lines=pending.split(/\r?\n/);pending=lines.pop();
    for(const line of lines){if(line.trim())try{const event=JSON.parse(line);lastEvent=Date.now();if(event.stage)current=event.stage;if(event.objectEvent)current=event.library+' :: '+event.name;show(event,request.quiet);}catch{}}
   }
  }catch{}finally{if(fd!==undefined)fs.closeSync(fd);}
 }
 const timer=setInterval(tail,200);
 const heartbeat=setInterval(()=>console.log(`[Waiting] Elapsed ${Math.round((Date.now()-started)/1000)} s; last stage/object: ${current}; ${Math.round((Date.now()-lastEvent)/1000)} s without a new callback${current==='full-rebuild'?' (PB has not reported the current object)':''}`),5000);
 child.on('close',()=>{
  clearInterval(heartbeat);
  clearInterval(timer);tail();
  let response;try{response=JSON.parse(stdout);}catch{response={ok:false,error:stderr||stdout||'Build process returned no result'};}
  if(!response.ok){console.error(`[Failed] ${response.error}`);process.exitCode=1;return;}
  const result=response.result;
  console.log(`[Result] ${result.success?'Success':'Failed'}; elapsed ${Math.round((Date.now()-started)/1000)} s; errors ${(result.errors||[]).length}; other diagnostics ${(result.information||[]).length}; rolled back ${result.rolledBack?'yes':'no'}`);
  for(const artifact of [...new Set(result.artifacts||[])])console.log(`[${result.rolledBack?'Rolled-back artifact':'Artifact'}] ${artifact}`);
  for(const warning of result.warnings||[])console.warn(`[Warning] ${warning}`);
  if(result.success){
   console.log(`[Success] Libraries: ${result.libraryCount}, errors: ${(result.errors||[]).length}`);
   if(result.exePath)console.log(`[EXE] ${result.exePath}`);
   console.log(`[Log] ${result.runDir}`);
  }else{
   console.error(`[Failed] ${result.error||'PowerBuilder build failed'}`);console.error(`[Log] ${result.runDir}`);process.exitCode=1;
  }
 });
 return null;
}

if(require.main===module){
 if(process.argv[2]==='--worker')worker(process.argv[3]);else{
  const code=main(process.argv.slice(2));if(Number.isInteger(code))process.exitCode=code;
 }
}

module.exports={parse};
