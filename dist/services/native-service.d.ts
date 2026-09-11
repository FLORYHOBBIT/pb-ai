export interface NativeImportResult {
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
export interface NativeDeleteResult {
    success: boolean;
    name: string;
    filename: string;
    returnCode: number;
}
export interface NativeCreatePblResult {
    success: boolean;
    path: string;
    returnCode: number;
}
export interface NativeDeletePblResult {
    success: boolean;
    path: string;
    action: string;
}
export interface NativeCreateExeResult {
    success: boolean;
    exePath: string;
    returnCode: number;
    linkErrors: string[];
}
/**
 * 通过 pb-native-host 导入源码文件到 PBL
 * 源文件支持 UTF-8、带 BOM 的 UTF-16 和当前 ANSI 编码
 */
export declare function importSourceViaNative(pblPath: string, srcFile: string, objectName: string, pbVersion: number, options?: {pbtPath?: string}): NativeImportResult;
/**
 * 通过 pb-native-host 从 PBL 中删除对象
 */
export declare function deleteObjectViaNative(pblPath: string, objectName: string, typeName: string, pbVersion?: number): NativeDeleteResult;
/**
 * 通过 pb-native-host 创建新的 PBL 库
 */
export declare function createPblViaNative(pblPath: string, comment?: string, pbVersion?: number): NativeCreatePblResult;
/**
 * 通过 pb-native-host 删除 PBL 文件
 */
export declare function deletePblViaNative(pblPath: string): NativeDeletePblResult;
/**
 * 通过 pb-native-host 编译 PBL 为 EXE
 */
export declare function createExeViaNative(pblPath: string, exePath: string, appName: string, options?: {
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
}, pbVersion?: number): NativeCreateExeResult;
