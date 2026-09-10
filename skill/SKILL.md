---
name: pb-workflow
description: PowerBuilder 工程工作流。支持新建 PB 工程、修改源码（窗口/DataWindow/函数等）、同步、编辑、导入操作。
---

# PowerBuilder 工程工作流

## 何时使用

当用户需要：
- **新建 PowerBuilder 工程**（创建 PBL、Application 对象、窗口等）
- 修改 PowerBuilder 对象源码（窗口、DataWindow、函数等）
- 查看或编辑 PBL 中的对象
- 批量修改 PB 工程中的源码

## 文件编码
除了pbt, pbw使用utf8编码，其它源码文件PowerBuidler10以下使用 ANSI， 10及以上使用UTF-16 Little Endian，所有源码文件换行使用 `回车换行符`

## 新建 PowerBuilder 工程

当用户要求创建新的 PB 工程时，按以下步骤操作：

**重要：所有源码文件统一存放在 `pb_ai_src/<pbl名>/` 目录下**

```
Task Progress:
- [ ] Step 1: 创建工程目录和 PBL
- [ ] Step 2: 创建 pb_ai_src 目录
- [ ] Step 3: 在 pb_ai_src 中创建源码文件
- [ ] Step 4: 导入源码到 PBL
- [ ] Step 5: 编译验证
```

### Step 1: 创建 PBL 和工程

- 创建 PBL
```
pbl_create_library:
  pblPath: <工程目录>/<应用名>.pbl
  comment: "应用描述"
```

- 创建pbt <工程目录>/<应用名>.pbt

```powerbuilder
Save Format v3.0(19990112)
appname "<应用名>";
applib "<应用名>.pbl";
liblist "<应用名>.pbl";
type "pb";
```

- 创建pbw <工程目录>/<应用名>.pbw

```powerbuilder
Save Format v3.0(19990112)
@begin Targets
 0 "<应用名>.pbt";
@end;
DefaultTarget "<应用名>.pbt";
DefaultRemoteTarget "<应用名>.pbt";
```

### Step 2: 创建 pb_ai_src 目录

源码统一存放在 `<工程目录>/pb_ai_src/<pbl名>/` 下（pbl名 = PBL 文件名不含扩展名）。

### Step 3: 在 pb_ai_src 中创建源码文件

使用 Write 工具将源码写入 `pb_ai_src` 目录, 编码格式使用UTF-16 Little Endian。

源码模板请参考（调用 pbl_workflow 工具加载）：
- Application 对象模板: `topic: "templates/application"`
- Window 对象模板: `topic: "templates/window"`
- DataWindow 对象模板: `topic: "templates/datawindow"`

### Step 4: 导入源码到 PBL

从 `pb_ai_src` 目录导入：

```
pbl_import_source:
  pblPath: <工程目录>/<应用名>.pbl
  srcFile: <工程目录>/pb_ai_src/<pbl名>/<应用名>.sra
  objectName: <应用名>
```

```
pbl_import_source:
  pblPath: <工程目录>/<应用名>.pbl
  srcFile: <工程目录>/pb_ai_src/<pbl名>/w_main.srw
  objectName: w_main
```

### Step 5: 编译验证

```
pbl_compile:
  pblPath: <工程目录>/<应用名>.pbl
```

### 创建 EXE（可选）

```
pbl_create_exe:
  pblPath: <工程目录>/<应用名>.pbl
  exePath: <输出目录>/<应用名>.exe
  appName: <应用名>
```

## 编辑已有工程源码

```
Task Progress:
- [ ] Step 1: 同步源码到本地目录
- [ ] Step 2: 查看/修改源文件
- [ ] Step 3: 导入修改后的源码到 PBL
- [ ] Step 4: 编译验证（可选）
```

### Step 1: 同步源码

调用 `pbl_sync_source` 将 PBL 中所有对象同步到 `pb_ai_src` 目录：

```
pbl_sync_source:
  pblPath: <PBL文件路径>
  baseDir: <工程目录>/pb_ai_src
```

该工具根据 PBL 时间戳判断是否需要覆盖，未变化的对象会自动跳过。

### Step 2: 编辑源码

源文件位于 `pb_ai_src/<pbl名>/` 目录下：

| 对象类型 | 扩展名 |
|---------|--------|
| Application | .sra |
| Window | .srw |
| Menu | .srm |
| DataWindow | .srd |
| Function | .srf |
| Structure | .srs |
| UserObject | .sru |

使用 Read/Edit 工具直接修改这些文件。

### Step 3: 导入 PBL

调用 `pbl_import_source` 将修改后的文件导入 PBL：

```
pbl_import_source:
  pblPath: <PBL文件路径>
  srcFile: <修改后的源文件路径>
  objectName: <对象名>
```

### Step 4: 编译验证（可选）

调用 `pbl_compile` 编译 PBL 中所有对象：

```
pbl_compile:
  pblPath: <PBL文件路径>
```

## 注意事项

1. **先同步再编辑**：始终先调用 `pbl_sync_source`，确保本地文件是最新的
2. **时间戳保护**：同步时不会覆盖未变化的文件，保护本地修改
3. **导入即编译**：`pbl_import_source` 会自动编译导入的对象
4. **错误处理**：如果导入失败，检查编译错误信息并修正源码
5. **窗口风格**: PC界面现代扁平化 Web 风格，窗口大小PB尺寸约4722 * 2496
6. **Control[] 数组顺序决定层叠关系**：PB 中 Control[] 数组靠前的控件绘制在上层，靠后的控件会被遮挡。当窗口中 u_webview 等全区域控件与普通控件（按钮等）共存时，**必须将普通控件放在数组前面**，全区域控件放在后面。正确示例：`this.Control[] = {this.cb_1, this.uo_web}`
7. **仅改外部页面无需编译 PB**：如果修改只涉及外部 HTML/JS/CSS 页面文件（如 u_webview 加载的本地 Web 页面），没有修改 PB 源码，则不需要导入/编译 PBL，直接更新页面文件即可生效

## 多 PBL 工程

如果工程包含多个 PBL，对每个 PBL 分别执行同步操作：

```
pbl_sync_source(pbl1, pb_ai_src)
pbl_sync_source(pbl2, pb_ai_src)
...
```

## 相关工具

| 工具 | 用途 |
|------|------|
| `pbl_create_library` | 创建新的 PBL 库 |
| `pbl_delete_library` | 删除 PBL 库 |
| `pbl_create_exe` | 编译 PBL 为 EXE |
| `pbl_sync_source` | 同步 PBL 源码到本地目录 |
| `pbl_list_objects` | 列出 PBL 中的对象 |
| `pbl_export_source` | 导出单个对象源码 |
| `pbl_import_source` | 导入源码到 PBL |
| `pbl_compile` | 编译 PBL |
| `pbl_workflow` | 获取工作流指南和源码模板 |
| `pbl_library_info` | 获取 PBL 库信息 |

## 数据窗口语法

DataWindow 对象源码模板请参考（调用 pbl_workflow 工具加载）：
- DataWindow 对象模板: `topic: "templates/datawindow"`

## u_webview 嵌入 WebView2

当 PB 需要现代UI或某些功能（如富文本编辑、代码编辑器、复杂图表、现代 UI 布局等）时，可使用 `u_webview` 自定义用户对象嵌入本地 Web 页面，通过 WebView2 实现 PB ↔ JavaScript 双向通信，借助前端技术栈完成复杂交互。

**前置步骤**：使用 u_webview 前，必须先确保工程目录下存在 `satwebview.dll`。如不存在，执行：
```
Invoke-WebRequest -Uri "http://www.satrda.com:5555/pbai/webview.zip" -OutFile "<工程目录>/webview.zip"
Expand-Archive -Path "<工程目录>/webview.zip" -DestinationPath "<工程目录>" -Force
Remove-Item "<工程目录>/webview.zip"
```

详细说明请参考（调用 pbl_workflow 工具加载）：
- u_webview 使用指南: `topic: "templates/u-webview"`

**注意**：如果修改只涉及外部 HTML/JS/CSS 页面文件，没有修改 PB 源码，不需要重新导入/编译 PBL，更新页面文件后重新打开页面即可生效。

## PB 两层转三层架构

解决外网访问数据库速度慢和掉线问题，通过 SatRDA 中间件驱动实现三层架构转换。
详细说明请参考（调用 pbl_workflow 工具加载）：
- 两层转三层说明: `topic: "templates/two-to-three-tier"`

## H5DW（HTML5 DataWindow）

H5DW 是 PowerBuilder DataWindow 的 JavaScript 实现，用于在 Web 前端集成 DataWindow 数据能力并制作 H5 报表。当用户需求涉及以下场景时，先调用 pbl_workflow 加载对应文档再执行：

- 集成 h5dw 组件（安装、DataWindow/DataStore API、事件、数据操作）: `topic: "h5dw/H5DW_AI_SKILL"`
- 制作 H5DW 报表（报表 JSON 结构、样式、分组汇总）: `topic: "h5dw/REPORT_AI_SKILL"`
- 单元格类型详解: `topic: "h5dw/CELL_TYPES_SKILL"`
- 事件参数参考: `topic: "h5dw/EVENT_PARAMETERS"`
- 自定义事件: `topic: "h5dw/CUSTOM_EVENTS_README"`
- 自定义函数: `topic: "h5dw/CUSTOM_FUNCTIONS_README"`
