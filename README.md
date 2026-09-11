# pb-ai

PowerBuilder 的 `pb-build` 命令行工具和 MCP 服务，维护项目为 [FLORYHOBBIT/pb-ai](https://github.com/FLORYHOBBIT/pb-ai)。本版本使用自有 C 原生组件，不再分发或调用原来的 PBSpy.dll、pb-cli.exe。上游来源说明见 [UPSTREAM.md](UPSTREAM.md)。

## 安装与使用

需要 Windows、Node.js 18+、.NET Framework 4.x，以及本机安装的对应版本 **Sybase ORCA 和 PowerBuilder 运行库**。当前适配版本号为 80、90、125；PB8 8.0.2.9506 支持真实对象进度。其他构建号会明确提示进度未适配，仍只执行一次完整重建。

试验版本先安装本地压缩包；未提交的修改不会通过 GitHub 安装得到：

```cmd
cd /d D:\Environment\pb-mcp-test
npm install "C:\Users\93199\Documents\Codex\2026-09-10\pb-ai-mcp\outputs\pb-ai-1.0.24-native.1.tgz"
.\node_modules\.bin\pb-build.cmd build "E:\job\source_gzjszyy\Zhis4\doctor.pbt" --pb-version 80 --exe "E:\job\source_gzjszyy\doctor\doctor.exe"
```

工具优先从对应版本的注册表安装目录、PATH 查找运行库。查找不到时，设置 `PB_RUNTIME_DIR`，或给编译命令增加 `--runtime-dir "D:\Environment\Sybase\Shared\PowerBuilder"`。该目录应包含真正的 `pborc80.dll` 等厂商文件，不能用重命名的 PBSpy 替代。

```cmd
set "PB_RUNTIME_DIR=D:\Environment\Sybase\Shared\PowerBuilder"
set "PB_VERSION=80"
```

`PB_VERSION` 用于未显式指定版本的库查看/导出工具。ANSI PBL 文件头不能区分 PB8/PB9，默认使用 PB8；Unicode 默认 PB12.5。创建、导入、删除对象和编译应明确指定实际 PB 版本，不能把此默认值当作文件版本检测结论。

常用编译参数：

| 参数 | 行为 |
| --- | --- |
| `compile <PBT/PBL>` | 完整重建，不生成 EXE/PBD |
| `build <PBT/PBL>` | 完整重建，再生成 EXE/PBD |
| `--exe <文件>` | EXE 生成位置；目录无效时回落 PBT/PBL 目录 |
| `--pbr <文件>` | 指定资源清单；默认应用同名 PBR |
| `--icon <文件>` | 指定图标；未提供且无同名图标时使用内置小图标 |
| `--output-dir <目录>` | 成功后额外复制 EXE 和 PBD；原产物保留 |
| `--quiet` | 隐藏逐对象和普通诊断，保留阶段与错误 |
| `--trace-objects` | 旧参数兼容；对象进度默认开启，不再预编译 |

PBD 默认生成在对应 PBL 旁，不再自动全部复制到 EXE 目录。CLI 显示对象的阶段编号、对象名和 PBL 路径；同一对象可能被 PB 在不同阶段处理，日志事件数量不是完成百分比。

## MCP

启动命令为 `node`，参数为安装包 `dist/index.js` 的绝对路径；也可以运行本地 `node_modules\.bin\pb-ai.cmd`。升级后重启 MCP 进程。

查看、列举、导出、同步、导入、删除、创建库、编译与构建工具均使用新的后端。工作流文档和独立 pbtoweb 工具保留。同步会保护比 PBL 对象更新的本地源码。

导入跨库对象时可传 `pbtPath`，以加载完整依赖列表；共享 PBL 被多个 PBT 引用时必须指定。导入错误会恢复目标 PBL，返回完整诊断，不把“对象已存在”误报成导入成功。

## 源码和构建

| 文件 | 职责 |
| --- | --- |
| `src/native/pb_native.c` → `pb-native.dll` | 自有 x86 C DLL，调用厂商 ORCA，并接入 PB8 真实对象回调 |
| `src/native/*.cs` → `pb-native-host.exe` | JSON/编码/进程隔离与 EXE 版本资源处理；源码全部在仓库 |
| `dist/services`、`dist/cli.js` | 项目解析、备份恢复、复制产物、MCP 与 CMD 日志 |

本项目没有重新实现 PowerScript 编译器；实际编译由本机 Sybase 原生编译器执行。厂商 DLL 不包含在 npm 包中。

```powershell
# 只需开发者重建二进制时执行；普通安装直接使用预编译文件。
.\build-native.ps1 -BootstrapCompiler
# 或使用已经安装的 x86 TinyCC：
.\build-native.ps1 -TccPath 'C:\tools\tcc\tcc.exe'
npm test
npm run test:native
```

`-BootstrapCompiler` 从 TinyCC 官方发行地址下载固定版本，并检查固定 SHA256；不修改全局 PATH。工具链不进入发布包。

验证范围和试验安装说明见 [TRIAL.md](TRIAL.md)，实现边界见 [FIX-README.md](FIX-README.md)。当前版本保持 `private=true`，未向 npm 注册表发布。
