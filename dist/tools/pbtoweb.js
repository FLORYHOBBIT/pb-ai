"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPbtowebTools = registerPbtowebTools;
const zod_1 = require("zod");
const pbtoweb_service_js_1 = require("../services/pbtoweb-service.js");
function registerPbtowebTools(server) {
    const srv = server;
    srv.tool('pbl_pbtoweb', '将 PowerBuilder 应用转换为 Web 应用。支持分步执行：setup(安装SatRDA和pbtoweb)、config(创建配置文件)、check(检查服务)、start(启动服务)、run(运行转换)。不传step则执行完整流程。', {
        step: zod_1.z.string().optional().describe('执行步骤: "setup" | "config" | "check" | "start" | "run"，不传则执行完整流程'),
        projectDir: zod_1.z.string().optional().describe('PB 工程目录路径（包含 .pbt 文件的目录）'),
        appName: zod_1.z.string().optional().describe('应用名称（用于生成配置文件）'),
        openWindow: zod_1.z.string().optional().describe('启动窗口名（默认 w_main）'),
        dbms: zod_1.z.string().optional().describe('数据库连接名（默认 erp）'),
        force: zod_1.z.boolean().optional().describe('强制安装，跳过确认提示（默认 false）'),
    }, async (params) => {
        const lines = [];
        try {
            const step = params.step?.toLowerCase();
            // Step: setup - 检查并安装 SatRDA + pbtoweb
            if (!step || step === 'setup') {
                const satCheck = (0, pbtoweb_service_js_1.checkSatRDAInstalled)();
                const pbtCheck = (0, pbtoweb_service_js_1.checkPbtowebInstalled)();
                const needInstall = !satCheck.installed || !pbtCheck.installed;
                if (needInstall && !params.force) {
                    // 未安装且未强制，提示用户确认
                    const lines = [];
                    lines.push('pbtoweb 需要 SatRDA 服务端支持，检测到以下组件未安装：');
                    lines.push('');
                    if (!satCheck.installed) {
                        lines.push(`  - SatRDA 服务器 (未安装，将下载到 ${satCheck.serverDir})`);
                    }
                    if (!pbtCheck.installed) {
                        lines.push('  - pbtoweb npm 包 (未安装)');
                    }
                    lines.push('');
                    lines.push('是否要安装以上组件？确认后调用:');
                    lines.push('  pbl_pbtoweb(step: "setup", force: true)');
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
                // 已安装或强制安装
                lines.push('=== Step 1: 安装 SatRDA 服务器 ===');
                if (satCheck.installed) {
                    lines.push(`SatRDA 已安装: ${satCheck.serverDir}`);
                }
                else {
                    const satResult = (0, pbtoweb_service_js_1.setupSatRDA)();
                    lines.push(`SatRDA 已安装到: ${satResult.serverDir}`);
                }
                lines.push('');
                lines.push('=== Step 2: 安装 pbtoweb ===');
                if (pbtCheck.installed) {
                    lines.push(`pbtoweb 已安装 (版本: ${pbtCheck.version})`);
                }
                else {
                    const pbtResult = (0, pbtoweb_service_js_1.installPbtoweb)();
                    lines.push(`pbtoweb 安装完成 (版本: ${pbtResult.version})`);
                }
                if (step === 'setup') {
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
            }
            // Step: config - 创建配置文件
            if (!step || step === 'config') {
                if (!params.projectDir || !params.appName) {
                    return {
                        content: [{
                                type: 'text',
                                text: '创建配置需要 projectDir 和 appName 参数\n用法: pbl_pbtoweb(step: "config", projectDir: "...", appName: "...")',
                            }],
                        isError: true,
                    };
                }
                lines.push('=== Step 3: 创建 pbtoweb.json 配置 ===');
                const configResult = (0, pbtoweb_service_js_1.createPbtowebConfig)(params.projectDir, params.appName, {
                    openWindow: params.openWindow,
                    dbms: params.dbms,
                });
                if (configResult.action === 'already_exists') {
                    lines.push(`配置文件已存在: ${configResult.configPath}`);
                }
                else {
                    lines.push(`配置文件已创建: ${configResult.configPath}`);
                }
                if (step === 'config') {
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
            }
            // Step: check - 检查 satserver.exe 状态
            if (!step || step === 'check') {
                lines.push('=== Step 4: 检查 SatRDA 服务 ===');
                const checkResult = (0, pbtoweb_service_js_1.checkSatServer)();
                if (checkResult.running) {
                    lines.push('satserver.exe 正在运行');
                }
                else {
                    lines.push('satserver.exe 未运行');
                    lines.push(`服务路径: ${checkResult.satExePath}`);
                    lines.push('');
                    lines.push('请启动服务后，在 SatRDA 后台管理界面修改数据连接 erp 的配置');
                    lines.push('可调用 pbl_pbtoweb(step: "start") 启动服务');
                }
                if (step === 'check') {
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
            }
            // Step: start - 启动 satserver.exe
            if (step === 'start') {
                lines.push('=== 启动 SatRDA 服务 ===');
                const startResult = (0, pbtoweb_service_js_1.startSatServer)();
                lines.push(`服务已启动: ${startResult.serverDir}`);
                lines.push('请在 SatRDA 后台管理界面修改数据连接 erp 的配置');
                return { content: [{ type: 'text', text: lines.join('\n') }] };
            }
            // Step: run - 执行 pbtoweb run
            if (!step || step === 'run') {
                if (!params.projectDir) {
                    return {
                        content: [{
                                type: 'text',
                                text: '运行 pbtoweb 需要 projectDir 参数\n用法: pbl_pbtoweb(step: "run", projectDir: "...")',
                            }],
                        isError: true,
                    };
                }
                lines.push('=== Step 5: 执行 pbtoweb run ===');
                const runResult = (0, pbtoweb_service_js_1.runPbtoweb)(params.projectDir);
                lines.push(runResult.output);
                // 转换成功提示
                lines.push('');
                lines.push('=== 转换完成 ===');
                if (params.appName) {
                    lines.push(`访问地址: http://127.0.0.1:5555/${params.appName}`);
                }
                lines.push('');
                lines.push('重要: 如需要访问数据库，请在 SatRDA 后台管理界面修改数据连接`erp` 连接数据库');
                lines.push(`后台地址: http://127.0.0.1:5555/admin`);
                lines.push(`文档: http://www.satrda.com/doc/satweb/pbtoweb.html`);
                if (step === 'run') {
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
            }
            // 完整流程结束
            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `${lines.join('\n')}\n错误: ${e.message}` }], isError: true };
        }
    });
}

