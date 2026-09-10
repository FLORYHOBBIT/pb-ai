"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importSourceViaPbspy = importSourceViaPbspy;
exports.deleteObjectViaPbspy = deleteObjectViaPbspy;
exports.createPblViaPbspy = createPblViaPbspy;
exports.deletePblViaPbspy = deletePblViaPbspy;
exports.createExeViaPbspy = createExeViaPbspy;
/**
 * PBSpy 服务 - 通过 pb-cli.exe (32位 C# CLI) 调用 PBSpy.dll
 * 提供 import (CompileEntryImport) 和 delete (LibraryEntryDelete) 功能
 */
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// pb-cli.exe 路径 (在 pb-mcp 目录下)
const PB_CLI = path_1.default.resolve(__dirname, '..', '..', 'pb-cli.exe');
/**
 * 通过 pb-cli 导入源码文件到 PBL
 * 调用方需确保源文件编码为 UTF-16LE (with BOM)
 */
function importSourceViaPbspy(pblPath, srcFile, objectName, pbVersion = 125) {
    const absPath = path_1.default.resolve(pblPath);
    const absSrc = path_1.default.resolve(srcFile);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    if (!fs_1.default.existsSync(absSrc))
        throw new Error(`源文件不存在: ${absSrc}`);
    if (!fs_1.default.existsSync(PB_CLI))
        throw new Error(`pb-cli.exe not found: ${PB_CLI}`);
    try {
        const output = (0, child_process_1.execFileSync)(PB_CLI, [`--version=${pbVersion}`, 'import', absPath, absSrc, objectName], {
            timeout: 120000,
            encoding: 'utf8',
        });
        const result = JSON.parse(output.trim());
        return {
            success: result.success,
            action: result.action || (result.success ? 'imported' : 'failed'),
            name: objectName,
            filename: objectName,
            errors: (result.errors || []).map((e) => {
                const parts = e.split('|');
                return {
                    level: parseInt(parts[0]) || 0,
                    messageNumber: parts[1] || '',
                    messageText: parts[2] || '',
                    line: parseInt(parts[3]) || 0,
                    column: parseInt(parts[4]) || 0,
                };
            }),
        };
    }
    catch (e) {
        if (e.stdout) {
            try {
                const result = JSON.parse(e.stdout.trim());
                return {
                    success: false,
                    action: 'failed',
                    name: objectName,
                    filename: objectName,
                    errors: [],
                };
            }
            catch { }
        }
        throw new Error(`pb-cli import failed: ${e.message}`);
    }
}
/**
 * 通过 pb-cli 从 PBL 中删除对象
 */
function deleteObjectViaPbspy(pblPath, objectName, typeName, pbVersion = 125) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(absPath))
        throw new Error(`PBL 文件不存在: ${absPath}`);
    if (!fs_1.default.existsSync(PB_CLI))
        throw new Error(`pb-cli.exe not found: ${PB_CLI}`);
    try {
        const output = (0, child_process_1.execFileSync)(PB_CLI, [`--version=${pbVersion}`, 'delete', absPath, objectName, typeName], {
            timeout: 30000,
            encoding: 'utf8',
        });
        const result = JSON.parse(output.trim());
        return {
            success: result.success,
            name: objectName,
            filename: objectName,
            returnCode: result.returnCode,
        };
    }
    catch (e) {
        if (e.stdout) {
            try {
                const result = JSON.parse(e.stdout.trim());
                return {
                    success: result.success || false,
                    name: objectName,
                    filename: objectName,
                    returnCode: result.returnCode || -1,
                };
            }
            catch { }
        }
        throw new Error(`pb-cli delete failed: ${e.message}`);
    }
}
/**
 * 通过 pb-cli 创建新的 PBL 库
 */
function createPblViaPbspy(pblPath, comment = '', pbVersion = 125) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(PB_CLI))
        throw new Error(`pb-cli.exe not found: ${PB_CLI}`);
    // 确保目标目录存在
    const dir = path_1.default.dirname(absPath);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    try {
        const output = (0, child_process_1.execFileSync)(PB_CLI, [`--version=${pbVersion}`, 'create-pbl', absPath, comment], {
            timeout: 30000,
            encoding: 'utf8',
        });
        const result = JSON.parse(output.trim());
        return {
            success: result.success,
            path: absPath,
            returnCode: result.returnCode,
        };
    }
    catch (e) {
        if (e.stdout) {
            try {
                const result = JSON.parse(e.stdout.trim());
                return {
                    success: result.success || false,
                    path: absPath,
                    returnCode: result.returnCode || -1,
                };
            }
            catch { }
        }
        throw new Error(`pb-cli create-pbl failed: ${e.message}`);
    }
}
/**
 * 通过 pb-cli 删除 PBL 文件
 */
function deletePblViaPbspy(pblPath) {
    const absPath = path_1.default.resolve(pblPath);
    if (!fs_1.default.existsSync(PB_CLI))
        throw new Error(`pb-cli.exe not found: ${PB_CLI}`);
    try {
        const output = (0, child_process_1.execFileSync)(PB_CLI, ['delete-pbl', absPath], {
            timeout: 30000,
            encoding: 'utf8',
        });
        const result = JSON.parse(output.trim());
        return {
            success: result.success,
            path: absPath,
            action: result.action || 'deleted',
        };
    }
    catch (e) {
        if (e.stdout) {
            try {
                const result = JSON.parse(e.stdout.trim());
                return {
                    success: result.success || false,
                    path: absPath,
                    action: result.action || 'failed',
                };
            }
            catch { }
        }
        throw new Error(`pb-cli delete-pbl failed: ${e.message}`);
    }
}
/**
 * 通过 pb-cli 编译 PBL 为 EXE
 */
function createExeViaPbspy(pblPath, exePath, appName, options = {}, pbVersion) {
    return require('./project-service').runProject(pblPath, pbVersion, { ...options, exePath, appName }, 'build');
}

