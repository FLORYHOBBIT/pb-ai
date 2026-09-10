"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSatRDAInstalled = checkSatRDAInstalled;
exports.checkPbtowebInstalled = checkPbtowebInstalled;
exports.setupSatRDA = setupSatRDA;
exports.installPbtoweb = installPbtoweb;
exports.createPbtowebConfig = createPbtowebConfig;
exports.checkSatServer = checkSatServer;
exports.startSatServer = startSatServer;
exports.runPbtoweb = runPbtoweb;
/**
 * pbtoweb 服务 - 将 PowerBuilder 应用转换为 Web 应用
 *
 * 依赖: SatRDA 服务器 + pbtoweb npm 包
 */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const SATRDA_URL = 'http://www.satrda.com:5555/SatRDA.zip';
/**
 * 确定 SatRDA 安装目录: 优先 D 盘，不存在则 C 盘
 */
function getSatRDADir() {
    if (fs_1.default.existsSync('D:\\')) {
        return 'D:\\satrda_webserver';
    }
    return 'C:\\satrda_webserver';
}
/**
 * 检查 SatRDA 是否已安装（不执行安装）
 */
function checkSatRDAInstalled() {
    const serverDir = getSatRDADir();
    const satExePath = path_1.default.join(serverDir, 'server', 'satserver.exe');
    return { installed: fs_1.default.existsSync(satExePath), serverDir, satExePath };
}
/**
 * 检查 pbtoweb 是否已安装（不执行安装）
 */
function checkPbtowebInstalled() {
    try {
        const ver = (0, child_process_1.execFileSync)('pbtoweb', ['--version'], { encoding: 'utf8', timeout: 10000 }).trim();
        return { installed: true, version: ver };
    }
    catch {
        return { installed: false };
    }
}
/**
 * 下载并解压 SatRDA
 */
function setupSatRDA() {
    const serverDir = getSatRDADir();
    const satExe = path_1.default.join(serverDir, 'server', 'satserver.exe');
    // 已安装则跳过
    if (fs_1.default.existsSync(satExe)) {
        return { serverDir, action: 'already_installed' };
    }
    // 确保父目录存在
    const parentDir = path_1.default.dirname(serverDir);
    if (!fs_1.default.existsSync(parentDir)) {
        fs_1.default.mkdirSync(parentDir, { recursive: true });
    }
    const zipPath = path_1.default.join(parentDir, 'SatRDA.zip');
    // 用 PowerShell 下载
    try {
        (0, child_process_1.execFileSync)('powershell', ['-Command', `Invoke-WebRequest -Uri '${SATRDA_URL}' -OutFile '${zipPath}'`], { timeout: 120000, windowsHide: true });
    }
    catch (e) {
        throw new Error(`下载 SatRDA 失败: ${e.message}\n请手动下载: ${SATRDA_URL}`);
    }
    // 用 PowerShell 解压
    try {
        (0, child_process_1.execFileSync)('powershell', ['-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${serverDir}' -Force`], { timeout: 60000, windowsHide: true });
    }
    catch (e) {
        throw new Error(`解压 SatRDA 失败: ${e.message}`);
    }
    // 清理 zip
    try {
        fs_1.default.unlinkSync(zipPath);
    }
    catch { /* ignore */ }
    if (!fs_1.default.existsSync(satExe)) {
        throw new Error(`安装异常: satserver.exe 未找到于 ${satExe}`);
    }
    return { serverDir, action: 'installed' };
}
/**
 * 安装 pbtoweb (npm i pbtoweb -g)
 */
function installPbtoweb() {
    // 检查是否已安装
    try {
        const ver = (0, child_process_1.execFileSync)('pbtoweb', ['--version'], { encoding: 'utf8', timeout: 10000 }).trim();
        return { action: 'already_installed', version: ver };
    }
    catch { /* 未安装，继续 */ }
    try {
        (0, child_process_1.execFileSync)('npm', ['i', 'pbtoweb', '-g'], { encoding: 'utf8', timeout: 120000 });
    }
    catch (e) {
        throw new Error(`安装 pbtoweb 失败: ${e.message}`);
    }
    // 验证安装
    try {
        const ver = (0, child_process_1.execFileSync)('pbtoweb', ['--version'], { encoding: 'utf8', timeout: 10000 }).trim();
        return { action: 'installed', version: ver };
    }
    catch {
        return { action: 'installed', version: 'unknown' };
    }
}
/**
 * 创建 pbtoweb.json 配置文件
 */
function createPbtowebConfig(projectDir, appName, options = {}) {
    const absDir = path_1.default.resolve(projectDir);
    if (!fs_1.default.existsSync(absDir))
        throw new Error(`工程目录不存在: ${absDir}`);
    const pbtPath = `./${appName}.pbt`;
    if (!fs_1.default.existsSync(path_1.default.join(absDir, `${appName}.pbt`))) {
        throw new Error(`PBT 文件不存在: ${path_1.default.join(absDir, `${appName}.pbt`)}`);
    }
    const serverDir = getSatRDADir();
    const configPath = path_1.default.join(absDir, 'pbtoweb.json');
    const config = {
        pbtPath,
        serverPath: `${serverDir.replace(/\\/g, '/')}/server/public/${appName}`,
        datawindowPath: `${serverDir.replace(/\\/g, '/')}/server/plugins/data`,
        apiPath: `${serverDir.replace(/\\/g, '/')}/server/plugins/erp`,
        openWindow: options.openWindow || 'w_main',
        dbms: options.dbms || 'erp',
        openURL1: `chrome --incognito "http://127.0.0.1:5555/${appName}"`,
        openURL: `http://127.0.0.1:5555/${appName}`,
        exclude: options.exclude || ['n_satapi'],
    };
    if (fs_1.default.existsSync(configPath)) {
        return { configPath, action: 'already_exists', config };
    }
    fs_1.default.writeFileSync(configPath, JSON.stringify(config, null, '\t'), 'utf-8');
    return { configPath, action: 'created', config };
}
/**
 * 检查 satserver.exe 是否正在运行
 */
function checkSatServer() {
    const serverDir = getSatRDADir();
    const satExePath = path_1.default.join(serverDir, 'server', 'satserver.exe');
    if (!fs_1.default.existsSync(satExePath)) {
        return { running: false, serverDir, satExePath };
    }
    // 用 tasklist 检查进程
    try {
        const output = (0, child_process_1.execFileSync)('tasklist', ['/FI', 'IMAGENAME eq satserver.exe'], {
            encoding: 'utf8',
            timeout: 10000,
            windowsHide: true,
        });
        const running = output.toLowerCase().includes('satserver.exe');
        return { running, serverDir, satExePath };
    }
    catch {
        return { running: false, serverDir, satExePath };
    }
}
/**
 * 启动 satserver.exe
 */
function startSatServer() {
    const serverDir = getSatRDADir();
    const satExePath = path_1.default.join(serverDir, 'server', 'satserver.exe');
    if (!fs_1.default.existsSync(satExePath)) {
        throw new Error(`satserver.exe 不存在: ${satExePath}，请先执行 setup`);
    }
    // 用 spawn 启动，不等待退出
    const { spawn } = require('child_process');
    spawn(satExePath, [], {
        cwd: path_1.default.join(serverDir, 'server'),
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
    });
    return { started: true, serverDir };
}
/**
 * 执行 pbtoweb run
 */
function runPbtoweb(projectDir) {
    const absDir = path_1.default.resolve(projectDir);
    const configFile = path_1.default.join(absDir, 'pbtoweb.json');
    if (!fs_1.default.existsSync(configFile)) {
        throw new Error(`pbtoweb.json 不存在: ${configFile}，请先创建配置`);
    }
    try {
        const output = (0, child_process_1.execFileSync)('pbtoweb', ['run'], {
            cwd: absDir,
            encoding: 'utf8',
            timeout: 300000,
        });
        return { output: output.trim(), success: true };
    }
    catch (e) {
        const stderr = e.stderr?.toString() || '';
        const stdout = e.stdout?.toString() || '';
        throw new Error(`pbtoweb run 失败:\n${stdout}\n${stderr}`);
    }
}

