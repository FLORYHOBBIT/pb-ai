# 上游来源与修改归属

本项目维护于 [FLORYHOBBIT/pb-ai](https://github.com/FLORYHOBBIT/pb-ai)，基于 [npm pb-ai-mcp 1.0.21](https://www.npmjs.com/package/pb-ai-mcp/v/1.0.21) 的发行内容进行修改。不是已确认上游 Git 仓库的 GitHub Fork；原包未提供有效的 repository 地址。

原包下载：[官方 npm 压缩包](https://registry.npmjs.org/pb-ai-mcp/-/pb-ai-mcp-1.0.21.tgz)。原始说明保存在 [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md)，其中占位 GitHub 地址不代表本项目上游地址。

## 原有二进制

以下文件从该 npm 原包重新提取并原样纳入本仓库，没有修改或反编译重建。

| 文件 | SHA-256 |
| --- | --- |
| pb-cli.exe | a300730bb341eaaae5a063891015d96c74ce16b87f2bc9b50f6bc09552173bb5 |
| PBSpy.dll | ee84236e01f6172311a0aa8797456e6bca20f00075bfef65ac0268d7d06aa2b4 |

压缩包 SHA-1：bfb6abb0cf83a977e4ec168019670746587c81bf。

重新获取：

```powershell
npm pack pb-ai-mcp@1.0.21 --registry=https://registry.npmjs.org
tar -xf pb-ai-mcp-1.0.21.tgz
# 原始文件位于 package/pb-cli.exe 和 package/PBSpy.dll
```

## 可维护代码与许可证信息

npm 原包包含 dist JavaScript 和声明文件，没有完整原始 TypeScript 项目，也没有这两个二进制的源码。本项目直接维护 dist 中的 JavaScript；新增桥的完整源码为 src/native/ProjectBuild.cs，生成 pb-project-build.exe。已去掉不能对应当前修改的 source map。

原包 package.json 标注许可证为 MIT，保留该标识及上游说明；不把上游代码和二进制的著作权归于本项目维护者。原包没有附带独立 LICENSE 文件，因此未编造上游作者或版权声明。

本次修改属于 FLORYHOBBIT/pb-ai：完整 PBT 库列表编译、默认 PBD/PBR/EXE 配置、异常路径回落、中文资源处理和失败恢复，详见 [FIX-README.md](FIX-README.md)。尚未向原 npm 包发布。

