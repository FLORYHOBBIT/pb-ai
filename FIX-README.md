# pb-ai 多库工程编译修复

基于本机安装的 1.0.21 修改。新增可编译的 C# x86 桥，继续调用原包 PBSpy.dll；原 pb-cli.exe 保留供读取、导出等操作使用。

## 默认行为

- `pbl_compile` 接受 PBT/PBL，自动发现同名 PBT，按原顺序加载完整库列表，设置应用对象，执行 Full Rebuild。
- `pbl_create_exe` 先完整重编译，再生成 PBD、EXE。默认为 Pcode，各库 PBD 标志全部为 1。
- 默认 EXE 为 PBT/PBL 目录中的 `应用名.exe`；PBR 为同目录的 `应用名.pbr`（存在才使用）；图标优先 `res/应用名.ico`，其次 `应用名.ico`。
- 默认不读取可能过期的外部 SRJ 文件。公司等版本描述沿用调用参数或默认值；可以显式设置。PBD 单库资源默认空，可用 `libraryPbrPaths` 按库顺序指定。
- 有效绝对路径保留，相对路径相对于 PBT/PBL 目录。失效的输入路径尝试当前目录同名文件；失效的 EXE 目录回落到当前目录，不创建旧目录。
- PBR 中的中文资源按 UTF-8 优先读取，已有 PB8 ANSI 文件明确按 GB18030 解码；只为编译器生成临时 ANSI 资源清单，不改写原 PBR。临时 PBR 放在当前工程目录，保证 PB8 按 PBR 目录解析相对资源路径；正常结束时清理。
- 缺库、缺资源、多个候选 PBT、重复 PBD 文件名均明确报错，不默默跳过。
- PBD 先在各自 PBL 目录生成，再汇集到 EXE 目录。
- 操作前备份相关 PBL、PBD、EXE。常规失败自动恢复；构建日志、请求和备份清单位于工具返回的 runDir。进程/机器意外终止时，应检查遗留构建锁及备份后再恢复。
- Info 不算编译错误。成功还要求输出文件存在且非空。

## 调用示例

```json
{"pblPath":"C:\\PBProjects\\Demo\\demo.pbt","pbVersion":80}
```

上述参数可用于 `pbl_compile`（仅编译），也可用于 `pbl_create_exe`（完整发布）。保留旧工具名称；`exePath`、`appName` 已改为可选，PBT 自动补齐。

## 安装及撤销

运行 `Install-Fix.ps1`，默认修复当前用户 `node_modules/pb-ai-mcp`。可用 `-Target` 指定其他安装位置。脚本自动创建 `.projectfix-backups` 备份，并输出确切路径。

安装后需重新连接 MCP 或重启 Codex，已运行进程内缓存的 JavaScript 不会自动更新。npm 重装/升级可能覆盖此本地修复。

撤销示例：

```powershell
.\Install-Fix.ps1 -Restore -BackupDirectory '安装时输出的备份目录'
```

`build-native.ps1` 使用 Windows 自带 .NET Framework C# 编译器重新生成 x86 桥；`node --test test/project.test.js` 运行配置测试。

源码包还包含 `test/native-smoke.test.js`。在 Windows 下执行 `node --test test/project.test.js test/native-smoke.test.js`，可同时验证中文工程目录、中文资源名、PBD、PBR 和 PB8 EXE 的实际生成。

## 代码位置

- `src/native/ProjectBuild.cs`：完整库列表、应用设置、重编译、PBD 和 EXE 调用及编译回调。
- `dist/services/project-service.js`：PBT 解析、路径回落、PBR、备份恢复、构建日志。
- `dist/tools/compile.js`：MCP 参数和结果展示。

当前验证范围以交付时的验证记录为准；PB8 之外的版本未做实机验证。不将构建成功等同于应用登录、数据库连接和业务功能验收。

