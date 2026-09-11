# 上游引用与修改归属

本项目维护于 [FLORYHOBBIT/pb-ai](https://github.com/FLORYHOBBIT/pb-ai)，最初基于 [npm pb-ai-mcp 1.0.21](https://www.npmjs.com/package/pb-ai-mcp/v/1.0.21) 的发行 JavaScript 和文档修改。原包没有提供完整 TypeScript 项目和有效 repository 地址，因此不将本仓库表述为已确认原 Git 仓库的 GitHub Fork。

原始说明保留在 [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md)，它是历史资料，其中旧运行要求和占位地址不适用于本版本。

原包的 `PBSpy.dll`、`pb-cli.exe` 曾原样使用；**自 1.0.24-native.1 起，两者均已移除，任何运行工具都不再依赖它们**。旧提交中的来源记录保留在 Git 历史中。当前安装不需要从 npm 原包重新获取这两个文件。

新增 `src/native/pb_native.c`、原生宿主源码与项目编译逻辑属于本项目维护内容；不把 Sybase PowerBuilder/ORCA 的代码或二进制归为本项目原创。厂商 DLL 由用户自己的安装环境提供，未打入本包。

接口参考：[ORCA ApplicationRebuild](https://docs.appeon.com/pb2022/orca_guide/XREF_71431_PBORCA.html)、[ORCA 新应用引导流程](https://docs.appeon.com/pb2022/orca_guide/XREF_29553_Bootstrapping_a.html)。PB8 对象回调兼容性依据本机 8.0.2.9506 的静态分析和独立运行验证，不能以新版本文档代替旧环境验证。

开发工具使用 [TinyCC](https://bellard.org/tcc/) 的 x86 Windows 发行版以及 Windows .NET Framework C# 编译器。工具链不分发到 npm 包。TinyCC 属于其自身许可证；本项目保留原 npm 包标注的 MIT 许可证信息，不编造原包作者或版权声明。
