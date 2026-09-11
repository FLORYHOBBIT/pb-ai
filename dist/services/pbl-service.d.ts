export interface LibraryInfo {
    path: string;
    version: string;
    format: string;
    isUnicode: boolean;
    entryCount: number;
    entries: ObjectInfo[];
}
export interface ObjectInfo {
    name: string;
    filename: string;
    typeName: string;
    category: string;
    dataSize: number;
    comment: string;
    modifiedTime: string;
}
export interface ImportResult {
    action: string;
    name: string;
    filename: string;
}
/**
 * 获取 PBL 库信息
 */
export declare function getLibraryInfo(pblPath: string): LibraryInfo;
/**
 * 列出 PBL 中的对象
 */
export declare function listObjects(pblPath: string, typeFilter?: string): ObjectInfo[];
/**
 * 导出单个对象的源码到文件
 */
export declare function exportSourceToFile(pblPath: string, objectName: string, outputDir: string): {
    filePath: string;
    filename: string;
    typeName: string;
};
/**
 * 导入源码到 PBL
 */
export declare function importSource(pblPath: string, objectName: string, source: string, srcFile?: string, pbVersion?: number, options?: {pbtPath?: string}): ImportResult;
/**
 * 删除 PBL 中的对象
 */
export declare function deleteObject(pblPath: string, objectName: string, pbVersion?: number): {
    deleted: boolean;
    name: string;
    filename: string;
};
/**
 * 创建新的 PBL 库文件
 */
export declare function createLibrary(pblPath: string, comment?: string, pbVersion?: number): {
    success: boolean;
    path: string;
};
/**
 * 删除 PBL 库文件
 */
export declare function deleteLibrary(pblPath: string): {
    success: boolean;
    path: string;
    action: string;
};
/**
 * 导出 PBL 中所有 SOURCE 对象到文件夹
 */
export declare function exportAllSource(pblPath: string, outputDir: string): {
    pblName: string;
    exportDir: string;
    exported: {
        name: string;
        filename: string;
        typeName: string;
    }[];
};
/**
 * 同步 PBL 中所有 SOURCE 对象到 pb_ai_src 目录 (时间戳感知)
 */
export declare function syncAllSource(pblPath: string, baseDir: string): {
    pblName: string;
    syncDir: string;
    synced: {
        name: string;
        filename: string;
        typeName: string;
        modifiedTime: string;
        action: string;
    }[];
    skipped: number;
};
/**
 * 创建可执行文件 (EXE)
 */
export declare function createExecutable(pblPath: string, exePath: string, appName: string, options?: {
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
    pbVersion?: number;
}): {
    success: boolean;
    exePath: string;
    linkErrors: string[];
};

