"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWorkflowTools = registerWorkflowTools;
/**
 * PBL 工作流指南 MCP 工具
 *
 * 从 skill 目录加载工作流文档和源码模板，
 * 相当于内置的"技能"，按需获取指导内容。
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zod_1 = require("zod");
// skill 目录：编译后位于 dist/tools/，所以 skill 在 ../../skill
const SKILL_DIR = path.resolve(__dirname, '..', '..', 'skill');
/**
 * 列出 skill 目录下所有可加载的文档（递归）
 */
function listTopics() {
    const topics = [];
    if (!fs.existsSync(SKILL_DIR))
        return topics;
    function scan(dir, prefix) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isFile() && entry.name.endsWith('.md')) {
                const name = entry.name.replace(/\.md$/, '');
                topics.push(prefix ? `${prefix}/${name}` : name);
            }
            else if (entry.isDirectory()) {
                scan(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
            }
        }
    }
    scan(SKILL_DIR, '');
    return topics;
}
/**
 * 加载指定 topic 的 markdown 文件内容
 */
function loadTopic(topic) {
    // 安全检查：防止路径穿越
    const normalized = path.normalize(topic).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(SKILL_DIR, `${normalized}.md`);
    // 确保解析后的路径仍在 SKILL_DIR 内
    if (!path.resolve(filePath).startsWith(path.resolve(SKILL_DIR))) {
        return null;
    }
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
}
function registerWorkflowTools(server) {
    const srv = server;
    srv.tool('pbl_workflow', '获取 PowerBuilder 工程工作流指南和源码模板。不传 topic 返回主工作流文档，传 topic 加载特定模板（如 "templates/application"）。调用 pbl_workflow 且 topic 为 "list" 可查看所有可用主题。', {
        topic: zod_1.z.string().optional().describe('文档主题名称（如 "templates/application"、"templates/window"），不传则返回主工作流文档，传 "list" 列出所有可用主题'),
    }, async ({ topic }) => {
        try {
            // 列出所有可用主题
            if (topic === 'list') {
                const topics = listTopics();
                if (topics.length === 0) {
                    return { content: [{ type: 'text', text: 'skill 目录不存在或为空' }] };
                }
                const text = [
                    '可用工作流主题:',
                    '',
                    ...topics.map(t => `  - ${t}`),
                    '',
                    '使用 pbl_workflow(topic: "<主题名>") 加载具体内容',
                ].join('\n');
                return { content: [{ type: 'text', text }] };
            }
            // 加载指定主题
            if (topic) {
                const content = loadTopic(topic);
                if (!content) {
                    const topics = listTopics();
                    return {
                        content: [{
                                type: 'text',
                                text: `未找到主题: "${topic}"\n\n可用主题:\n${topics.map(t => `  - ${t}`).join('\n')}`,
                            }],
                        isError: true,
                    };
                }
                return { content: [{ type: 'text', text: content }] };
            }
            // 默认加载主文档 SKILL.md
            const skillFile = path.join(SKILL_DIR, 'SKILL.md');
            if (!fs.existsSync(skillFile)) {
                return {
                    content: [{
                            type: 'text',
                            text: `skill 目录不存在: ${SKILL_DIR}\n可用主题: ${listTopics().join(', ') || '无'}`,
                        }],
                    isError: true,
                };
            }
            const content = fs.readFileSync(skillFile, 'utf-8');
            return { content: [{ type: 'text', text: content }] };
        }
        catch (e) {
            return { content: [{ type: 'text', text: `错误: ${e.message}` }], isError: true };
        }
    });
}

