# pb-ai-mcp：PowerBuilder 多库编译修复

基于 npm pb-ai-mcp 1.0.21 的独立维护版本，目标项目：[FLORYHOBBIT/pb-ai-mcp](https://github.com/FLORYHOBBIT/pb-ai-mcp)。上游引用、二进制来源和 SHA-256 见 [UPSTREAM.md](UPSTREAM.md)。

修复单 PBL 编译未加载依赖库的问题，支持按 PBT 完整库列表重编译和生成 PBD、EXE。默认优先保持上一级同名应用目录作为 EXE/PBD 输出目录，目录不存在或显式目录异常时回落到当前 PBT/PBL 目录。详细行为、参数和恢复方法见 [FIX-README.md](FIX-README.md)。

## 安装和运行

需要 Windows、Node.js 和与工程版本匹配的 PowerBuilder 运行环境；原生桥使用 x86 .NET Framework。

```powershell
npm install
npm run build:native
npm test
npm start
```

MCP 启动命令为 node，参数为本仓库 dist/index.js 的绝对路径。原有 pb-cli.exe、PBSpy.dll 已从官方 npm 原包提取并放入仓库；新增 pb-project-build.exe 可由源码重新构建。原包未提供完整 TypeScript 工程，修改 JavaScript 后不需要 tsc。

在具备 PB8 环境的 Windows 上运行 npm run test:native，验证真实 EXE/PBD 和中文 PBR 资源。交付修复已在 PB8 多库工程及中文资源样例验证；其他 PB 版本及应用业务运行未验收。

package.json 设置 private=true，避免误发布到原 npm 包名；GitHub 仓库公开可见性由 GitHub 设置决定。

