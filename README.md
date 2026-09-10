# pb-ai-mcp：PowerBuilder 多库编译修复

基于 npm pb-ai-mcp 1.0.21 的独立维护版本，目标项目：[FLORYHOBBIT/pb-ai-mcp](https://github.com/FLORYHOBBIT/pb-ai-mcp)。上游引用、二进制来源和 SHA-256 见 [UPSTREAM.md](UPSTREAM.md)。

修复单 PBL 编译未加载依赖库的问题，支持按 PBT 完整库列表重编译和生成 PBD、EXE。PBR、EXE 使用默认配置，异常目录回落到当前 PBT/PBL 目录。详细行为、参数和恢复方法见 [FIX-README.md](FIX-README.md)。

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

# pb-ai-mcp

PowerBuilder PBL 操作的 MCP 服务器，让 AI 能够直接读取、编辑、编译 PowerBuilder 工程。

## 功能特性

- **查看 PBL 信息** - 获取 PBL 版本、格式、对象列表
- **导出源码** - 导出单个或所有对象的源码
- **导入源码** - 将修改后的源码导入 PBL（自动编译）
- **同步源码** - 智能同步到本地目录，时间戳保护避免覆盖
- **删除对象** - 从 PBL 中删除指定对象
- **编译 PBL** - 编译 PBL 中所有对象
- **创建 EXE** - 编译 PBL 为可执行文件

## 系统要求

- **Node.js** >= 16.0.0
- **Windows** (pb-cli.exe 是 32 位 .NET 程序)
- **PowerBuilder Runtime DLL** 

## 安装

```bash
npm install -g pb-ai-mcp
```

## 配置 AI 编辑器


### Qoder/ Cursor

在 Settings > MCP 中添加：

```json
{
  "mcpServers": {
    "pb-ai-mcp": {
      "command": "npx",
      "args": ["pb-ai-mcp"]
    }
  }
}
```

### VS Code (Copilot)

在 `.vscode/settings.json` 中添加：

```json
{
  "chat.mcp.servers": {
    "pb-ai-mcp": {
      "command": "npx",
      "args": ["pb-ai-mcp"]
    }
  }
}
```

## MCP 工具列表

| 工具名               | 说明                                    |
| -------------------- | --------------------------------------- |
| `pbl_library_info`   | 获取 PBL 库信息（版本、格式、对象列表） |
| `pbl_list_objects`   | 列出 PBL 中的源码对象，可按类型过滤     |
| `pbl_export_source`  | 导出单个对象的源码                      |
| `pbl_export_all`     | 导出所有源码对象到目录                  |
| `pbl_sync_source`    | 同步源码到本地目录（时间戳感知）        |
| `pbl_import_source`  | 导入源码文件到 PBL                      |
| `pbl_delete_object`  | 删除 PBL 中的对象                       |
| `pbl_compile`        | 编译 PBL 中所有对象                     |
| `pbl_create_library` | 创建新的 PBL 库                         |
| `pbl_delete_library` | 删除 PBL 库文件                         |
| `pbl_create_exe`     | 编译 PBL 为 EXE 可执行文件              |


## 对象类型与扩展名

| 类型        | 扩展名 |
| ----------- | ------ |
| Application | .sra   |
| Window      | .srw   |
| Menu        | .srm   |
| DataWindow  | .srd   |
| Function    | .srf   |
| Structure   | .srs   |
| UserObject  | .sru   |
| Query       | .srq   |
| Pipeline    | .srp   |
| Project     | .srj   |

## 支持的 PowerBuilder 版本

- PB 10+ (HDR/Unicode-ENT/DAT 格式)
- PB 9 (HDR/ANSI-ENT/DAT 格式)
- PB 6-9 Classic (Block-based 格式)

## 故障排除

### pb-cli.exe not found

确保 `pb-cli.exe` 和 `PBSpy.dll` 与 `pb-ai-mcp` 在同一目录。

### 加载失败

- 检查是否安装了 PowerBuilder Runtime
- 确保系统是 Windows（不支持 Linux/Mac）

### 导入源码失败

- 检查源码语法是否正确
- 查看编译错误信息定位问题
- 确保对象类型匹配

## 许可证

MIT

## 相关链接

- [npm 包](https://www.npmjs.com/package/pb-ai-mcp)
- [MCP 协议](https://modelcontextprotocol.io/)
- [问题反馈](https://github.com/your-username/pb-ai-mcp/issues)

## 捐赠支持

如果你觉得这个项目帮助到了你，你可以请作者喝杯咖啡表示鼓励 ☕️

<table>
<tr>
<td style="padding: 10px;"><img src="http://www.satrda.com:5555/pbai/image/weixin.jpg" height="520" alt="微信"></td>
<td style="padding: 10px;"><img src="http://www.satrda.com:5555/pbai/image/zhifubao.jpg" height="520" alt="支付宝"></td>
</tr>
</table>

