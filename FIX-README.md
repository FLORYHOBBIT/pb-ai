# 自有原生后端与编译行为

此次移除了原包两个二进制及其调用服务。所有 PBL 工具改用 `pb-native-host.exe` 和自有 C DLL `pb-native.dll`，再调用本机厂商 ORCA。没有复制 PBSpy 的内部实现，也不通过 PBSpy 的私有会话布局获取上下文。

## 对象进度

PB8 8.0.2.9506 的 ORCA 导入表按序号引用 `cm_rebuild_application`。自有 C DLL 在一次重建调用期间替换该进程的导入槽，为厂商内部回调配置补入观察函数，然后调用原函数并恢复导入槽；不修改磁盘 DLL。原回调存在时继续转发它的返回值。

回调包含阶段编号、对象名、库路径。C# 立即复制字符串，以 UTF-8 JSONL 输出；100ms 批量刷新，CLI 200ms 读取。完全移除了先逐对象 Regenerate 再 Full Rebuild 的分支。

未知 PB8 构建号、PB9 和 PB12.5 不启用未经验证的内部进度适配，仍走厂商公开完整重建接口，不回退到双重编译。仅有阶段和耗时不代表百分比。内部接口支持范围与公开 ORCA 功能支持范围分开记录。

## 项目、产物与恢复

- PBT 加载完整且有序的依赖库列表；PBL 可发现同名/唯一引用它的 PBT。
- PBD 在各自 PBL 目录生成。EXE 使用指定位置，默认 PBT/PBL 目录；无效目录回落。
- 同名 PBR、图标采用默认值；旧路径按当前目录同名文件回落，缺失资源明确失败。
- PBR 资源规范化为绝对路径，并编码为 PB8 ANSI/PB12.5 Unicode；不改原 PBR。
- `outputDir` 只在成功后复制 EXE/PBD；默认不复制到 EXE 目录。
- 编译前备份 PBL、预期产物和覆盖目的文件；失败恢复，并保留诊断与备份路径。
- 导入/删除失败恢复目标库。共享库导入可指定 `pbtPath`；歧义不随机选择工程。

## EXE 版本资源

PB8 厂商 ORCA 没有 SetExeInfo 导出。宿主替换模板原有的中性语言版本资源，保留 EXE 尾部的 PB 库数据及其原文件偏移。Windows UpdateResource 会丢弃尾部数据，而且移动它会破坏 PB 的绝对文件指针，因此不能直接修改资源后宣布成功。

版本字符串过长、超过模板预留资源空间时明确失败并恢复备份，不输出损坏的 EXE。版本资源修复已有实际运行样例验证；不以“存在 EXE 文件”代替可执行验证。

## 依赖与接口

安装需要本机匹配版本的 Sybase ORCA 和运行库。以 `PB_RUNTIME_DIR`/`runtimeDir` 明确指定优先；其次注册表安装位置、PATH。拒绝带 PBSpy 特征导出的替代 ORCA 文件。

所有包内新增二进制均有源码，构建入口为 `build-native.ps1`。C DLL 对外导出 `pb_load`、`pb_open`、`pb_close`、`pb_libraries`、`pb_application`、`pb_rebuild`、`pb_set_progress`、`pb_directory`、`pb_export`、`pb_import`、`pb_pbd`、`pb_exe` 等函数；x86 stdcall 导出采用 `_name@字节数` 修饰。宿主负责结构、ANSI/Unicode 字符串和回调生命周期。

`Install-Fix.ps1` 可对既有包目录做文件级升级和回滚，包括移除旧二进制；通常推荐直接 npm 安装试验 tgz。
