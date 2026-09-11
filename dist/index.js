#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * PB MCP Server - PowerBuilder PBL 操作 MCP 服务器
 *
 * 提供 10 个 MCP 工具:
 * - pbl_library_info: 获取 PBL 库信息
 * - pbl_list_objects: 列出 PBL 中的对象
 * - pbl_create_library: 创建新的 PBL 库
 * - pbl_delete_library: 删除 PBL 库文件
 * - pbl_export_source: 导出对象源码
 * - pbl_export_all: 导出 PBL 中所有源码对象到文件夹
 * - pbl_import_source: 导入/更新对象源码
 * - pbl_delete_object: 删除对象
 * - pbl_compile: 编译 PBL (通过自有 pb-native.dll)
 * - pbl_create_exe: 编译 PBL 为 EXE 可执行文件
 * - pbl_workflow: 获取工作流指南和源码模板
 * - pbl_pbtoweb: 将 PB 应用转换为 Web 应用
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const library_js_1 = require("./tools/library.js");
const source_js_1 = require("./tools/source.js");
const compile_js_1 = require("./tools/compile.js");
const workflow_js_1 = require("./tools/workflow.js");
const pbtoweb_js_1 = require("./tools/pbtoweb.js");
async function main() {
    const server = new mcp_js_1.McpServer({
        name: 'pb-ai',
        version: require('../package.json').version,
    });
    // 注册所有工具
    (0, library_js_1.registerLibraryTools)(server);
    (0, source_js_1.registerSourceTools)(server);
    (0, compile_js_1.registerCompileTools)(server);
    (0, workflow_js_1.registerWorkflowTools)(server);
    (0, pbtoweb_js_1.registerPbtowebTools)(server);
    // 启动 stdio 传输
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('PB MCP Server 已启动 (stdio)');
}
main().catch((err) => {
    console.error('MCP Server 启动失败:', err);
    process.exit(1);
});

