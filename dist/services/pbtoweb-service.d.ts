/**
 * 检查 SatRDA 是否已安装（不执行安装）
 */
export declare function checkSatRDAInstalled(): {
    installed: boolean;
    serverDir: string;
    satExePath: string;
};
/**
 * 检查 pbtoweb 是否已安装（不执行安装）
 */
export declare function checkPbtowebInstalled(): {
    installed: boolean;
    version?: string;
};
/**
 * 下载并解压 SatRDA
 */
export declare function setupSatRDA(): {
    serverDir: string;
    action: string;
};
/**
 * 安装 pbtoweb (npm i pbtoweb -g)
 */
export declare function installPbtoweb(): {
    action: string;
    version?: string;
};
/**
 * 创建 pbtoweb.json 配置文件
 */
export declare function createPbtowebConfig(projectDir: string, appName: string, options?: {
    openWindow?: string;
    dbms?: string;
    exclude?: string[];
}): {
    configPath: string;
    action: string;
    config: any;
};
/**
 * 检查 satserver.exe 是否正在运行
 */
export declare function checkSatServer(): {
    running: boolean;
    serverDir: string;
    satExePath: string;
};
/**
 * 启动 satserver.exe
 */
export declare function startSatServer(): {
    started: boolean;
    serverDir: string;
};
/**
 * 执行 pbtoweb run
 */
export declare function runPbtoweb(projectDir: string): {
    output: string;
    success: boolean;
};

