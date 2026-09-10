#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),os=require('os');
const {spawn}=require('child_process');
const {runProject}=require('./services/project-service');

const usage=`pb-build - PowerBuilder 工程编译工具

用法:
  pb-build compile <PBT或PBL> --pb-version <版本>
  pb-build build   <PBT或PBL> --pb-version <版本>

选项:
  --exe <路径>       指定生成的 EXE 路径
  --pbr <路径>       指定 PBR 文件
  --icon <路径>      指定图标文件
  --quiet            不显示逐条编译消息
  -h, --help         显示帮助

示例:
  pb-build build "E:\\job\\source_gzjszyy\\Zhis4\\doctor.pbt" --pb-version 80`;

function parse(argv){
 if(argv.includes('-h')||argv.includes('--help'))return {help:true};
 const action=argv.shift(),input=argv.shift();
 if(!['compile','build'].includes(action)||!input)throw new Error('必须指定 compile/build 和 PBT/PBL 路径');
 const result={action,input,options:{},quiet:false};
 const flags={'--pb-version':'pbVersion','--exe':'exePath','--pbr':'pbrPath','--icon':'iconPath'};
 while(argv.length){
  const flag=argv.shift();
  if(flag==='--quiet'){result.quiet=true;continue;}
  const key=flags[flag];if(!key||!argv.length||argv[0].startsWith('--'))throw new Error(`未知或缺少参数：${flag}`);
  result[key]=argv.shift();
 }
 result.pbVersion=Number(result.pbVersion);
 if(!Number.isInteger(result.pbVersion)||result.pbVersion<=0)throw new Error('--pb-version 必须是正整数，例如 80');
 for(const key of ['exePath','pbrPath','iconPath'])if(result[key])result.options[key]=result[key];
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
 'open-session':'打开 PowerBuilder 会话','set-library-list':'加载工程依赖库','set-application':'设置应用对象',
 'full-rebuild':'完整编译工程','set-exe-info':'写入 EXE 版本信息','create-exe':'生成 EXE','complete':'编译完成'
};
function show(event,quiet){
 if(event.stage){
  const label=event.stage.startsWith('create-pbd: ')?`生成 PBD：${path.basename(event.stage.slice(12))}`:(stageNames[event.stage]||event.stage);
  console.log(`[状态] ${label}`);return;
 }
 if(event.linkMessage){console.log(`[链接] ${event.linkMessage}`);return;}
 if(event.messageText&&(!quiet||event.isError)){
  const where=event.line?` (${event.line}:${event.column||0})`:'';
  console.log(`[${event.isError?'错误':'编译'}] ${event.messageNumber||''} ${event.messageText}${where}`.trim());
 }
}

function main(argv){
 let request;try{request=parse([...argv]);}catch(error){console.error(error.message+'\n\n'+usage);return 2;}
 if(request.help){console.log(usage);return 0;}
 request.input=path.resolve(request.input);
 request.runRoot=fs.mkdtempSync(path.join(os.tmpdir(),'pb-build-cli-'));
 console.log(`[开始] ${request.action==='build'?'编译并生成 EXE/PBD':'仅编译'}：${request.input}`);
 const encoded=Buffer.from(JSON.stringify(request),'utf8').toString('base64');
 const child=spawn(process.execPath,[__filename,'--worker',encoded],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='',logFile=null,lineCount=0;
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
 child.on('error',error=>{stderr+=error.message;});
 function tail(){
  if(!logFile){
   const dirs=fs.readdirSync(request.runRoot,{withFileTypes:true}).filter(x=>x.isDirectory());
   if(dirs.length)logFile=path.join(request.runRoot,dirs[0].name,'progress.jsonl');
  }
  if(!logFile||!fs.existsSync(logFile))return;
  let content;try{content=fs.readFileSync(logFile,'utf8');}catch{return;}
  const lines=content.split(/\r?\n/);lines.pop();
  for(const line of lines.slice(lineCount)){if(line.trim())try{show(JSON.parse(line),request.quiet);}catch{}}
  lineCount=lines.length;
 }
 const timer=setInterval(tail,200);
 child.on('close',()=>{
  clearInterval(timer);tail();
  let response;try{response=JSON.parse(stdout);}catch{response={ok:false,error:stderr||stdout||'编译进程没有返回结果'};}
  if(!response.ok){console.error(`[失败] ${response.error}`);process.exitCode=1;return;}
  const result=response.result;
  for(const warning of result.warnings||[])console.warn(`[警告] ${warning}`);
  if(result.success){
   console.log(`[成功] 库数量：${result.libraryCount}，错误：${(result.errors||[]).length}`);
   if(result.exePath)console.log(`[EXE] ${result.exePath}`);
   console.log(`[日志] ${result.runDir}`);
  }else{
   console.error(`[失败] ${result.error||'PowerBuilder 编译失败'}`);console.error(`[日志] ${result.runDir}`);process.exitCode=1;
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
