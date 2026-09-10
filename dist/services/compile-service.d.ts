export interface CompileResult {
 success: boolean; libraryCount: number; appName: string; returnCode: number;
 errors: Array<{level: number; messageNumber: string; messageText: string; line: number; column: number; isError: boolean}>;
 information: Array<unknown>; runDir: string; output: string; warnings: string[]; artifacts: string[];
}
export declare function compilePbl(pblPath: string, pbVersion: number, options?: Record<string, unknown>): CompileResult;

