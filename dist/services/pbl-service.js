"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLibraryInfo = getLibraryInfo;
exports.listObjects = listObjects;
exports.exportSourceToFile = exportSourceToFile;
exports.importSource = importSource;
exports.deleteObject = deleteObject;
exports.createLibrary = createLibrary;
exports.deleteLibrary = deleteLibrary;
exports.exportAllSource = exportAllSource;
exports.syncAllSource = syncAllSource;
exports.createExecutable = createExecutable;
/**
 * PBL 操作服务 - 全部通过 pb-native-host.exe 实现 (通过自有 C DLL 和本机 Sybase ORCA 运行库)
 */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const native_service_1 = require("./native-service");
// pb-native-host.exe 路径 (在 pb-mcp 目录下)
const PB_CLI = path_1.default.resolve(__dirname, '..', '..', 'pb-native-host.exe');
function callPbCli(args) {
    const result = native_service_1.call(args);
    if (result.success === false) throw new Error(result.error || '原生操作失败');
    return result;
}
/**
 * 从 PBL 文件头部自动检测 PB 版本
 * ANSI (byte5 != 0) → PB_VERSION 或 80
 * Unicode (byte5 == 0) → 125 (PB12.5 默认)
 */
function detectPbVersion(pblPath) {
    try {
        const buf = fs_1.default.readFileSync(pblPath);
        if (buf.length < 32 || buf.slice(0, 4).toString('ascii') !== 'HDR*')
            return 125;
        // byte 5: 0x00 = Unicode, otherwise ANSI
        if (buf[5] !== 0x00)
            return Number(process.env.PB_VERSION||80); // ANSI defaults to the configured PB8 runtime
        return 125; // Unicode → PB12.5 default
    }
    catch {
        return 125;
    }
}
/**
 * 获取 PBL 库信息
 */
function getLibraryInfo(pblPath) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    const info = callPbCli(['info', absPath]);
    const listResult = callPbCli(['list', absPath]);
    const entries = listResult.map((e) => ({
        name: e.name,
        filename: e.filename,
        typeName: e.typeName,
        category: e.category,
        dataSize: e.dataSize || 0,
        comment: '',
        modifiedTime: e.modifiedTime || '',
    }));
    return {
        path: info.path,
        version: info.version || 'unknown',
        format: info.format || 'unknown',
        isUnicode: info.isUnicode || false,
        entryCount: info.entryCount || entries.length,
        entries,
    };
}
/**
 * 列出 PBL 中的对象
 */
function listObjects(pblPath, typeFilter) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    const args = ['list', absPath];
    if (typeFilter)
        args.push(typeFilter);
    const listResult = callPbCli(args);
    return listResult.map((e) => ({
        name: e.name,
        filename: e.filename,
        typeName: e.typeName,
        category: e.category,
        dataSize: e.dataSize || 0,
        comment: '',
        modifiedTime: e.modifiedTime || '',
    }));
}
/**
 * 导出单个对象的源码到文件
 */
function exportSourceToFile(pblPath, objectName, outputDir) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    const absOutDir = path_1.default.resolve(outputDir);
    if (!fs_1.default.existsSync(absOutDir))
        fs_1.default.mkdirSync(absOutDir, { recursive: true });
    // 先用 list 获取对象信息
    const listResult = callPbCli(['list', absPath]);
    const entry = listResult.find((e) => e.name.toLowerCase() === objectName.toLowerCase());
    if (!entry)
        throw new Error(`未找到对象: ${objectName}`);
    const filename = entry.filename;
    const filePath = path_1.default.join(absOutDir, filename);
    // 直接用 pb-native-host 导出到文件
    callPbCli(['export', absPath, objectName, filePath]);
    return {
        filePath,
        filename,
        typeName: entry.typeName,
    };
}
/**
 * 根据对象名前缀推断 PowerBuilder 对象类型
 */
const TYPE_FROM_PREFIX = {
    w_: { typeName: 'Window', ext: '.srw' },
    d_: { typeName: 'DataWindow', ext: '.srd' },
    m_: { typeName: 'Menu', ext: '.srm' },
    uf_: { typeName: 'Function', ext: '.srf' },
    f_: { typeName: 'Function', ext: '.srf' },
    uo_: { typeName: 'UserObject', ext: '.sru' },
    n_: { typeName: 'NonVisualObject', ext: '.sru' },
    s_: { typeName: 'Structure', ext: '.srs' },
    p_: { typeName: 'Pipeline', ext: '.srp' },
    app_: { typeName: 'Application', ext: '.sra' },
};
/**
 * 根据文件扩展名推断 PowerBuilder 对象类型
 */
const TYPE_FROM_EXT = {
    '.srw': 'Window',
    '.srd': 'DataWindow',
    '.sra': 'Application',
    '.srm': 'Menu',
    '.srf': 'Function',
    '.sru': 'UserObject',
    '.srs': 'Structure',
    '.srp': 'Pipeline',
};
// 按优先级排序：app_ 最先，然后按前缀长度降序
const PREFIX_ORDER = ['app_', 'uf_', 'uo_', 'w_', 'd_', 'm_', 'f_', 'n_', 's_', 'p_'];
function inferTypeFromName(objectName) {
    const lower = objectName.toLowerCase();
    for (const prefix of PREFIX_ORDER) {
        if (lower.startsWith(prefix)) {
            const info = TYPE_FROM_PREFIX[prefix];
            return { typeName: info.typeName, filename: objectName + info.ext };
        }
    }
    return { typeName: 'UserObject', filename: objectName + '.sru' };
}
/**
 * 导入源码到 PBL
 */
function importSource(pblPath, objectName, source, srcFile, pbVersion, options={}) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    // 自动检测 PBL 版本（如果未指定）
    const effectiveVersion = pbVersion ?? detectPbVersion(absPath);
    // 确定源文件路径（调用方需确保文件编码为 UTF-16LE with BOM）
    let absSrcFile;
    if (srcFile) {
        absSrcFile = path_1.default.resolve(srcFile);
        if (!fs_1.default.existsSync(absSrcFile))
            throw new Error(`源文件不存在: ${absSrcFile}`);
    }
    else {
        // 无文件路径时，写入临时文件（UTF-16LE with BOM）
        const workDir = path_1.default.join(path_1.default.dirname(absPath), '.pb-mcp-work');
        if (!fs_1.default.existsSync(workDir))
            fs_1.default.mkdirSync(workDir, { recursive: true });
        const ext = '.txt';
        absSrcFile = path_1.default.join(workDir, `${objectName}_import_src${ext}`);
        const sourceWithCRLF = source.replace(/\r?\n/g, '\r\n');
        const bom = Buffer.from([0xFF, 0xFE]);
        const contentBuffer = Buffer.from(sourceWithCRLF, 'utf16le');
        fs_1.default.writeFileSync(absSrcFile, Buffer.concat([bom, contentBuffer]));
    }
    // 1. 先查找 PBL 中已有条目以确定类型
    let typeName = '';
    let filename = '';
    try {
        const listResult = callPbCli(['list', absPath]);
        const existing = listResult.find((e) => e.name.toLowerCase() === objectName.toLowerCase());
        if (existing) {
            typeName = existing.typeName;
            filename = existing.filename;
        }
    }
    catch { /* ignore */ }
    // 2. 若 PBL 中无此对象，从 srcFile 扩展名推断
    if (!typeName && srcFile) {
        const ext = path_1.default.extname(srcFile).toLowerCase();
        if (TYPE_FROM_EXT[ext]) {
            typeName = TYPE_FROM_EXT[ext];
            filename = objectName + ext;
        }
    }
    // 3. 若仍无类型，从对象名前缀推断
    if (!typeName) {
        const inferred = inferTypeFromName(objectName);
        typeName = inferred.typeName;
        filename = inferred.filename;
    }
    const result = (0, native_service_1.importSourceViaNative)(absPath, absSrcFile, objectName, effectiveVersion, options);
    if (!result.success) {
        const details=result.errors.map(e=>e.messageText).join('\n');
        throw new Error(`导入失败：${details||result.error||'原生编译器返回失败'}`);
    }
    return {
        action: result.action || 'imported',
        name: objectName,
        filename,
    };
}
/**
 * 删除 PBL 中的对象
 */
function deleteObject(pblPath, objectName, pbVersion) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    const effectiveVersion = pbVersion ?? detectPbVersion(absPath);
    // 查找对象类型
    let typeName = '';
    let filename = objectName;
    const listResult = callPbCli(['list', absPath]);
    const entry = listResult.find((e) => e.name.toLowerCase() === objectName.toLowerCase());
    if (entry) {
        typeName = entry.typeName;
        filename = entry.filename;
    }
    else {
        throw new Error(`未找到对象: ${objectName}`);
    }
    const result = (0, native_service_1.deleteObjectViaNative)(absPath, objectName, typeName, effectiveVersion);
    if (!result.success) {
        throw new Error(`删除失败: 返回码 ${result.returnCode}`);
    }
    return { deleted: true, name: entry.name, filename };
}
/**
 * 创建新的 PBL 库文件
 */
function createLibrary(pblPath, comment = '', pbVersion = 125) {
    const absPath = path_1.default.resolve(pblPath);
    const result = (0, native_service_1.createPblViaNative)(absPath, comment, pbVersion);
    if (!result.success) {
        throw new Error(`创建 PBL 失败: 返回码 ${result.returnCode}`);
    }
    return { success: true, path: result.path };
}
/**
 * 删除 PBL 库文件
 */
function deleteLibrary(pblPath) {
    const absPath = path_1.default.resolve(pblPath);
    const result = (0, native_service_1.deletePblViaNative)(absPath);
    if (!result.success) {
        throw new Error(`删除 PBL 失败`);
    }
    return { success: true, path: result.path, action: result.action };
}
/**
 * 导出 PBL 中所有 SOURCE 对象到文件夹
 */
function exportAllSource(pblPath, outputDir) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    const result = callPbCli(['export-all', absPath, path_1.default.resolve(outputDir)]);
    return {
        pblName: result.pblName,
        exportDir: result.outputDir,
        exported: result.exported || [],
    };
}
/**
 * 同步 PBL 中所有 SOURCE 对象到 pb_ai_src 目录 (时间戳感知)
 */
function syncAllSource(pblPath, baseDir) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    const result = callPbCli(['sync-source', absPath, path_1.default.resolve(baseDir)]);
    return {
        pblName: result.pblName,
        syncDir: result.syncDir,
        synced: result.synced || [],
        skipped: result.skipped || 0,
    };
}
/**
 * 创建可执行文件 (EXE)
 */
function createExecutable(pblPath, exePath, appName, options = {}) {
    const absPbl = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPbl))
        throw new Error(`PBL 文件不存在: ${absPbl}`);
    const result = (0, native_service_1.createExeViaNative)(absPbl, exePath, appName, options, options.pbVersion ?? detectPbVersion(absPbl));
    if (!result.success) {
        const errDetails = result.linkErrors.length > 0
            ? result.linkErrors.join('\n')
            : `返回码 ${result.returnCode}`;
        throw new Error(`创建 EXE 失败: ${errDetails}`);
    }
    return { success: true, exePath: result.exePath, linkErrors: result.linkErrors };
}

