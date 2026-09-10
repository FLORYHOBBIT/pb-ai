"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLibraryTools = registerLibraryTools;
const zod_1 = require("zod");
const pbl_service_js_1 = require("../services/pbl-service.js");
const WORKFLOW_HINT = '【提示：首次使用请先调用 pbl_workflow 工具获取完整工作流指导】';
function registerLibraryTools(server) {
    const srv = server;
    // pbl_library_info - 获取 PBL 库信息
    srv.tool('pbl_library_info', '获取 PowerBuilder PBL 库文件信息，包括版本、格式、编码、对象列表', { pblPath: zod_1.z.string().describe('PBL 文件路径') }, async ({ pblPath }) => {
        try {
            const info = (0, pbl_service_js_1.getLibraryInfo)(pblPath);
            const text = [
                `PBL: ${info.path}`,
                `版本: ${info.version}`,
                `格式: ${info.format}`,
                `编码: ${info.isUnicode ? 'Unicode (UTF-16LE)' : 'ANSI'}`,
                `对象数: ${info.entryCount}`,
                '',
                '对象列表:',
                ...info.entries.map(e => `  ${e.filename}  [${e.typeName}]  ${e.dataSize} bytes  (${e.category})  ${e.modifiedTime || ''}`),
            ].join('\n');
            return { content: [{ type: 'text', text }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
    // pbl_list_objects - 列出 PBL 中的对象
    srv.tool('pbl_list_objects', `${WORKFLOW_HINT} 列出 PBL 库中的所有源码对象，可按类型过滤`, {
        pblPath: zod_1.z.string().describe('PBL 文件路径'),
        typeFilter: zod_1.z.string().optional().describe('类型过滤 (如 Window, DataWindow, Function, UserObject 等)'),
    }, async ({ pblPath, typeFilter }) => {
        try {
            const objects = (0, pbl_service_js_1.listObjects)(pblPath, typeFilter);
            if (objects.length === 0) {
                return { content: [{ type: 'text', text: typeFilter ? `未找到类型为 "${typeFilter}" 的对象` : 'PBL 中没有源码对象' }] };
            }
            const text = [
                `共 ${objects.length} 个对象${typeFilter ? ` (过滤: ${typeFilter})` : ''}:`,
                '',
                ...objects.map((e, i) => `${i + 1}. ${e.name}  [${e.typeName}]  (${e.filename})  ${e.dataSize} bytes  ${e.modifiedTime || ''}`),
            ].join('\n');
            return { content: [{ type: 'text', text }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
    // pbl_sync_source - 同步 PBL 源码对象到工作目录
    srv.tool('pbl_sync_source', '将 PBL 中所有源码对象同步到指定目录（pb_ai_src），根据时间戳判断是否需要覆盖。用于 AI 编辑工程时先同步源码到本地目录。', {
        pblPath: zod_1.z.string().describe('PBL 文件路径'),
        baseDir: zod_1.z.string().describe('同步目标根目录 (通常为工程目录下的 pb_ai_src)'),
    }, async ({ pblPath, baseDir }) => {
        try {
            const result = (0, pbl_service_js_1.syncAllSource)(pblPath, baseDir);
            const lines = [
                `同步完成: ${result.pblName}`,
                `目录: ${result.syncDir}`,
                `更新: ${result.synced.length} 个对象, 跳过: ${result.skipped} 个 (时间戳未变)`,
            ];
            if (result.synced.length > 0) {
                lines.push('');
                lines.push('更新的对象:');
                for (const s of result.synced) {
                    lines.push(`  ${s.filename}  [${s.typeName}]  ${s.modifiedTime}  (${s.action})`);
                }
            }
            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
    // pbl_create_library - 创建新的 PBL 库文件
    srv.tool('pbl_create_library', `${WORKFLOW_HINT} 创建新的 PowerBuilder PBL 库文件（如果文件已存在则失败）`, {
        pblPath: zod_1.z.string().describe('PBL 文件路径 (如 C:\\pb\\myapp.pbl)'),
        comment: zod_1.z.string().optional().describe('库注释 (可选)'),
        pbVersion: zod_1.z.number().describe('PowerBuilder 版本号（必填），必须与目标 PBL 文件的 PB 版本匹配。支持: 50(PB5), 60(PB6), 70(PB7), 80(PB8), 90(PB9), 100(PB10), 105(PB10.5), 110(PB11), 115(PB11.5), 120(PB12), 125(PB12.5), 150(PB2019), 126(PB12.6), 170(PB2021), 180(PB2022), 190(PB2022R3)'),
    }, async ({ pblPath, comment, pbVersion }) => {
        try {
            const result = (0, pbl_service_js_1.createLibrary)(pblPath, comment || '', pbVersion);
            return {
                content: [{
                        type: 'text',
                        text: `PBL 库创建成功: ${result.path}`,
                    }],
            };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
    // pbl_delete_library - 删除 PBL 库文件
    srv.tool('pbl_delete_library', '删除 PowerBuilder PBL 库文件及其关联的 PBD 文件', {
        pblPath: zod_1.z.string().describe('PBL 文件路径'),
    }, async ({ pblPath }) => {
        try {
            const result = (0, pbl_service_js_1.deleteLibrary)(pblPath);
            return {
                content: [{
                        type: 'text',
                        text: `PBL 库已删除: ${result.path} (${result.action})`,
                    }],
            };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
}

