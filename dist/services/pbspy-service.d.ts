export interface PbspyImportResult {
    success: boolean;
    action: string;
    name: string;
    filename: string;
    errors: {
        level: number;
        messageNumber: string;
        messageText: string;
        line: number;
        column: number;
    }[];
}
export interface PbspyDeleteResult {
    success: boolean;
    name: string;
    filename: string;
    returnCode: number;
}
export interface PbspyCreatePblResult {
    success: boolean;
    path: string;
    returnCode: number;
}
export interface PbspyDeletePblResult {
    success: boolean;
    path: string;
    action: string;
}
export interface PbspyCreateExeResult {
    success: boolean;
    exePath: string;
    returnCode: number;
    linkErrors: string[];
}
/**
 * 通过 pb-cli 导入源码文件到 PBL
 * 调用方需确保源文件编码为 UTF-16LE (with BOM)
 */
export declare function importSourceViaPbspy(pblPath: string, srcFile: string, objectName: string, pbVersion?: number): PbspyImportResult;
/**
 * 通过 pb-cli 从 PBL 中删除对象
 */
export declare function deleteObjectViaPbspy(pblPath: string, objectName: string, typeName: string, pbVersion?: number): PbspyDeleteResult;
/**
 * 通过 pb-cli 创建新的 PBL 库
 */
export declare function createPblViaPbspy(pblPath: string, comment?: string, pbVersion?: number): PbspyCreatePblResult;
/**
 * 通过 pb-cli 删除 PBL 文件
 */
export declare function deletePblViaPbspy(pblPath: string): PbspyDeletePblResult;
/**
 * 通过 pb-cli 编译 PBL 为 EXE
 */
export declare function createExeViaPbspy(pblPath: string, exePath: string, appName: string, options?: {
    iconPath?: string;
    pbrPath?: string;
    company?: string;
    product?: string;
    description?: string;
    copyright?: string;
    fileVersion?: string;
    fileVersionNum?: string;
    productVersion?: string;
    productVersionNum?: string;
}, pbVersion?: number): PbspyCreateExeResult;

