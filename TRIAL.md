# 1.0.24-native.1 试验说明

本地已替换全部 PBSpy 运行调用；尚未提交、推送或发布到 npm。请先安装试验包测试 CMD。

```cmd
cd /d D:\Environment\pb-mcp-test
npm install "C:\Users\93199\Documents\Codex\2026-09-10\pb-ai-mcp\outputs\pb-ai-1.0.24-native.1.tgz"
.\node_modules\.bin\pb-build.cmd build "E:\job\source_gzjszyy\Zhis4\doctor.pbt" --pb-version 80 --exe "E:\job\source_gzjszyy\doctor\doctor.exe" --runtime-dir "D:\Environment\Sybase\Shared\PowerBuilder"
```

无需添加 `--trace-objects`。PBD 保留在各自 PBL 旁；如需另存发布目录，在命令末尾添加 `--output-dir "D:\pb-release\doctor"`。

MCP 升级后需要重新启动其进程。配置仍指向 `node + dist/index.js`。若进行 PB9 的库查看/导出，设置 `PB_VERSION=90`，不要靠 ANSI 文件头猜测版本。

## 已完成验证

- 参数和项目路径测试通过。
- PB8 实编译样例：中文目录、中文 PBR 资源、EXE/PBD、可选复制目录、真实对象回调；完整重建一次，无预编译循环。
- 小程序 EXE 实际运行，写出验证文件并正常退出，验证版本资源处理没有损坏尾部 PB 数据。
- PBL 创建、导入、列举、单对象导出、全量导出、同步、删除；错误导入恢复原库。
- 跨库继承编译成功；移除依赖后准确报错，PBL 从备份恢复。
- doctor 的独立副本：36 个库、3381 个对象，一次 Full Rebuild，16905 条对象阶段回调，0 编译错误、69 条其他诊断。
- doctor 初次产物检查发现版本资源更新会丢弃 EXE 尾部数据；修复后复用已编译的 PBL 重新生成产物，未重新编译对象。最终 36 个 PBD 和 EXE 生成成功，EXE 为 1,065,984 字节。

doctor 验证只对工作区副本执行，未改医院原工程，未运行医生站业务程序。没有做普通版/进度版在同一输入下的耗时对照，因此不声明具体加速比例。PB9/PB12.5 的进度适配未启用。

诊断副本位于工作区 `work/native-doctor-ZWafXY`；完整重建日志在其 `logs/doctor-djVOMh`，版本资源修复后的产物结果在 `package-fixed-result.json`。工作区诊断数据不包含在 npm 包中。

## IDE 日志显示对照

根据用户提供的 doctor IDE 日志，与 CLI 的同工程副本日志逐条对比：16905 条记录的库名、对象名、顺序全部一致。阶段 1、2、3 对应 `Building type`（共 13524 条），阶段 4 对应 `Regenerating`（3381 条）。CLI 使用对应的英文描述及 `library.pbl(object.sr*) . . .` 格式，不再将回调次数标为对象数量。此映射依据当前 PB8 实测，不表示已确认编译器内部每个阶段的具体算法。

native.4 已接入 PB8 8.0.2.9506 的原生对象写入回调，覆盖 PBD 生成和 EXE 内嵌对象写入。doctor 副本仅执行产物生成时收到 3395 条 Writing，与 IDE 日志的库名、对象名、顺序逐条一致；未增加对象遍历或重复编译。窗口隐藏编译对象后缀以匹配 IDE，原始日志保留真实名称。原始 JSONL 保留 phase 和 sequence，便于排障。
