"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSourceTools = registerSourceTools;
const zod_1 = require("zod");
const pbl_service_js_1 = require("../services/pbl-service.js");
function registerSourceTools(server) {
    const srv = server;
    // pbl_export_source - 导出对象源码到文件
    srv.tool('pbl_export_source', '从 PBL 库中导出指定对象的 PowerBuilder 源码到文件', {
        pblPath: zod_1.z.string().describe('PBL 文件路径'),
        objectName: zod_1.z.string().describe('对象名称 (如 w_main, d_customer, f_calc 等)'),
        outputDir: zod_1.z.string().describe('输出目录路径'),
    }, async ({ pblPath, objectName, outputDir }) => {
        try {
            const result = (0, pbl_service_js_1.exportSourceToFile)(pblPath, objectName, outputDir);
            const text = `导出成功: ${result.filename} [${result.typeName}]\n文件路径: ${result.filePath}`;
            return { content: [{ type: 'text', text }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
    // pbl_export_all - 导出 PBL 中所有 SOURCE 对象到文件夹
    srv.tool('pbl_export_all', '导出 PBL 库中所有源码对象到指定目录，每个 PBL 导出到以 PBL 文件名命名的子文件夹中', {
        pblPath: zod_1.z.string().describe('PBL 文件路径'),
        outputDir: zod_1.z.string().describe('输出目录路径'),
    }, async ({ pblPath, outputDir }) => {
        try {
            const result = (0, pbl_service_js_1.exportAllSource)(pblPath, outputDir);
            const lines = [];
            lines.push(`导出完成: ${result.pblName} -> ${result.exportDir}`);
            lines.push(`共导出 ${result.exported.length} 个对象:`);
            lines.push('');
            for (const obj of result.exported) {
                lines.push(`  ${obj.filename}  [${obj.typeName}]`);
            }
            return { content: [{ type: 'text', text: lines.join('\n') }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
    // pbl_import_source - 导入/更新对象源码
    srv.tool('pbl_import_source', '将 PowerBuilder 源码文件导入到 PBL 库中（新增或更新对象）。通过指定源文件路径导入，对象类型从文件扩展名推断。注意：对象间存在依赖时导入可能有编译警告，但对象已成功创建，全部导入后执行 pbl_compile 即可解决。', {
        pblPath: zod_1.z.string().describe('PBL 文件路径'),
        objectName: zod_1.z.string().describe('对象名称'),
        srcFile: zod_1.z.string().describe('源文件路径（如 w_main.srw, d_emp.srd 等），类型从扩展名推断'),
        pbVersion: zod_1.z.number().describe('PowerBuilder 版本号（必填），必须与 PBL 文件的 PB 版本匹配。支持: 50(PB5), 60(PB6), 70(PB7), 80(PB8), 90(PB9), 100(PB10), 105(PB10.5), 110(PB11), 115(PB11.5), 120(PB12), 125(PB12.5), 150(PB2019), 126(PB12.6), 170(PB2021), 180(PB2022), 190(PB2022R3)'),
    }, async ({ pblPath, objectName, srcFile, pbVersion }) => {
        try {
            const result = (0, pbl_service_js_1.importSource)(pblPath, objectName, '', srcFile, pbVersion);
            const actionText = result.action === 'imported_with_warnings'
                ? '导入成功(有编译警告，全部导入后 pbl_compile 可解决)'
                : `导入成功: ${result.action}`;
            return {
                content: [{
                        type: 'text',
                        text: `${actionText} - ${result.name} (${result.filename})`,
                    }],
            };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
    // pbl_delete_object - 删除对象
    srv.tool('pbl_delete_object', '从 PBL 库中删除指定对象', {
        pblPath: zod_1.z.string().describe('PBL 文件路径'),
        objectName: zod_1.z.string().describe('要删除的对象名称'),
        pbVersion: zod_1.z.number().describe('PowerBuilder 版本号（必填），必须与 PBL 文件的 PB 版本匹配。支持: 50(PB5), 60(PB6), 70(PB7), 80(PB8), 90(PB9), 100(PB10), 105(PB10.5), 110(PB11), 115(PB11.5), 120(PB12), 125(PB12.5), 150(PB2019), 126(PB12.6), 170(PB2021), 180(PB2022), 190(PB2022R3)'),
    }, async ({ pblPath, objectName, pbVersion }) => {
        try {
            const result = (0, pbl_service_js_1.deleteObject)(pblPath, objectName, pbVersion);
            return {
                content: [{
                        type: 'text',
                        text: `删除成功: ${result.name} (${result.filename})`,
                    }],
            };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
}

