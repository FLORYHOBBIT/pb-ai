'use strict';
const {z}=require('zod');
const {runProject}=require('../services/project-service');
const common={
 pblPath:z.string().describe('PBT或PBL文件路径；传PBL时自动查找同名PBT并加载全部依赖库'),
 pbVersion:z.number().int().describe('实际PowerBuilder版本，PB8=80；必须明确指定'),
 pbtPath:z.string().optional().describe('可选的明确PBT路径，解决同一PBL属于多个工程的情况'),
 appName:z.string().optional().describe('无PBT时的应用对象名称；有PBT时自动读取'),
 libraryList:z.array(z.string()).optional().describe('无PBT时的完整依赖库列表')
};
function format(result,build){
 const lines=[`${build?'构建':'编译'}结果：${result.success?'成功':'失败'}`,`应用：${result.appName}；依赖库：${result.libraryCount}`,`错误：${result.errors.length}；其他编译消息：${result.information.length}`];
 if(result.exePath)lines.push(`EXE：${result.exePath}`);
 if(result.artifacts.length)lines.push(`产物：\n${result.artifacts.join('\n')}`);
 for(const e of result.errors.slice(0,40))lines.push(`${e.messageText}（行${e.line}，列${e.column}）`);
 if(result.errors.length>40)lines.push('其余错误见日志。');
 if(result.error)lines.push(result.error);
 if(result.linkErrors.length)lines.push('链接消息：',...result.linkErrors.slice(0,40));
 if(result.warnings.length)lines.push('路径调整：',...result.warnings.slice(0,40));
 if(result.rolledBack)lines.push('失败前的PBL及发布文件已从备份恢复。');
 lines.push(`日志和备份：${result.runDir}`);
 return {content:[{type:'text',text:lines.join('\n')}],isError:!result.success};
}
function registerCompileTools(server){
 server.tool('pbl_compile','按PBT完整库列表重编译应用；自动备份，失败恢复。仅编译，不生成EXE。',common,async args=>{
  try{return format(runProject(args.pblPath,args.pbVersion,args,'compile'),false);}catch(e){return {content:[{type:'text',text:e.message}],isError:true};}
 });
 server.tool('pbl_create_exe','完整重编译并生成PBD及EXE。默认Pcode、全部库生成PBD、同名PBR；失效目录回落到PBT/PBL目录。',{
  ...common,
  exePath:z.string().optional().describe('默认当前PBT/PBL目录下的应用名.exe；指定目录不存在时回落当前工程目录'),
  pbrPath:z.string().optional().describe('默认当前工程目录下的应用名.pbr；旧路径失效时查找当前目录同名文件'),
  iconPath:z.string().optional().describe('默认res/应用名.ico或应用名.ico'),
  pbdFlags:z.array(z.number().int().min(0).max(1)).optional().describe('按库列表顺序，1为PBD，0并入EXE；默认全部为1'),
  libraryPbrPaths:z.array(z.string()).optional().describe('与库列表对应的PBD资源文件，空字符串表示无资源；默认全部为空'),
  company:z.string().optional(),product:z.string().optional(),description:z.string().optional(),copyright:z.string().optional(),
  fileVersion:z.string().optional(),fileVersionNum:z.string().optional(),productVersion:z.string().optional(),productVersionNum:z.string().optional()
 },async args=>{
  try{return format(runProject(args.pblPath,args.pbVersion,args,'build'),true);}catch(e){return {content:[{type:'text',text:e.message}],isError:true};}
 });
}
exports.registerCompileTools=registerCompileTools;

