---
name: pb-u-webview
description: PowerBuilder 中使用 u_webview 自定义用户对象嵌入 WebView2 浏览器控件，实现 PB 与 JavaScript 双向通信。当开发 PB 程序需要嵌入 Web 页面、使用 u_webview、satwebview.dll、WebView2、PB 与 JS 交互、嵌入编辑器/数据窗口/前端框架页面时使用此 skill。
---

# u_webview 使用指南

## 概述

`u_webview` 是 PowerBuilder 自定义用户对象，封装 `satwebview.dll`（基于 WebView2），在 PB 窗口中嵌入 Web 页面，实现 PB ↔ JavaScript 双向通信。

**依赖**: `satwebview.dll` + 系统已安装 WebView2 Runtime。

**获取 satwebview.dll**：从 http://www.satrda.com:5555/pbai/webview.zip 下载后解压到工程目录下。使用 PowerShell 命令：
```powershell
Invoke-WebRequest -Uri "http://www.satrda.com:5555/pbai/webview.zip" -OutFile "<工程目录>/webview.zip"
Expand-Archive -Path "<工程目录>/webview.zip" -DestinationPath "<工程目录>" -Force
Remove-Item "<工程目录>/webview.zip"
```

## u_webview 源码定义

> **PB 10+ 与 PB 9 的区别**：PB 10 及以上版本默认使用 Unicode，而 `satwebview.dll` 的字符串参数函数期望 ANSI 编码。
> 直接复制对应版本源码对象并导入

### PB 10+ 版本（含 Ansi alias）
`src\u_webview_pb10.sru`


### PB 9 及以下版本（无需 Ansi alias）
`src\u_webview_pb10.sru`


## 公共方法

| 方法 | 说明 |
|------|------|
| `of_navigate(url)` | 导航到指定 URL |
| `of_eval(js)` | 执行 JS（无返回值，适合异步操作） |
| `of_executejs(js)` | 执行 JS 并返回字符串结果（同步） |
| `of_return(id, status, args)` | 返回结果给 JS 调用 |
| `of_opendevtools()` | 打开开发者工具 |

## 事件

| 事件 | 说明 |
|------|------|
| `ue_resize` (pbm_size) | 自动调用 satwv_resize |
| `onmessage` (pbm_custom01) | 接收 JS 消息并分发 |
| `onpbevent(id, req, arg)` | JS 调用 `_OnPBEvent` 时触发 |
| `navigationcompleted` | 页面加载完成后触发 |

## 在窗口中使用

### 1. 窗口定义中放置控件

```powerbuilder
type uo_1 from u_webview within w_mywindow
integer x = 5
integer width = 3173
integer height = 936
integer taborder = 10
end type
```

### 2. Open 事件导航

```powerbuilder
uo_1.of_navigate("file://" + gs_dir + '\myfolder\index.html')
```

### 3. Resize 事件自适应

```powerbuilder
// 全窗口覆盖
uo_1.resize(newwidth, newheight)
// 或留出按钮区域
uo_1.resize(newwidth, newheight - uo_1.y)
```

### 4. NavigationCompleted 事件初始化

```powerbuilder
uo_1.of_eval("initApp()")
```

## PB 调用 JS

### of_eval - 无返回值（异步操作用 IIFE 包装）

```powerbuilder
string ls_js
ls_js = "(async ()=> {" + &
    "await dwMain.setDataObject('mydata');" + &
    "let data = await loadFiles('data/mydata');" + &
    "dwMain.data = data;" + &
    "})()"
uo_1.of_eval(ls_js)
```

### of_executejs - 同步获取返回值

```powerbuilder
string ls_js, ls_return
ls_js = "editor.getValue()"
ls_return = uo_1.of_executejs(ls_js)
```

### 传递 PB 变量到 JS

```powerbuilder
string ls_data, ls_js
ls_data = string(n_api.of_dw2json(lds_tmp))
ls_js = "(async ()=> {" + &
    "let value = " + ls_data + ";" + &
    "dwMain.data = value.data;" + &
    "})()"
uo_1.of_eval(ls_js)
```

## JS 调用 PB

### _OnPBEvent - JS 触发 PB 事件

```javascript
// JS 端 - 触发 PB 的 onpbevent 事件
_OnPBEvent('saveas', base64Data);
```

```powerbuilder
// PB 端 onpbevent 事件处理
// req 为 JSON 数组格式: ["saveas","base64data"]
ulong ll_json, ll_item
string ls_str
blob lb_data

ll_json = n_api.JsonObject_Create(req)
ll_item = n_api.JsonObject_IndexOf(ll_json, 1)
ls_str = n_api.JsonObject_ToString(ll_item)
n_api.JsonObject_destroy(ll_json)
lb_data = n_api.of_base64decode(ls_str)
```

### bind/return 模式（带返回值）

```powerbuilder
// PB 端绑定函数
satwv_bind(il_w, "myFunc", 消息常量, 参数)
// 在 onpbevent 中返回结果
satwv_return(il_w, id, 0, '{"result":"ok"}')
```

## 文件访问协议

satwebview.dll 支持 `https://file//` 协议访问本地文件, 这个主要用于js中读取本地文件，navigate本地文件用`file://`：

```powerbuilder
// PB 中加载本地 HTML
uo_1.of_navigate("file://" + gs_dir + '\h5dw\index.html')

// JS 中读取本地文件
ls_js = "axios.get('https://file//" + ls_filepath + "', {responseType: 'arraybuffer'})"
```

## 典型应用场景

### 嵌入代码编辑器（Ace Editor）

HTML 引入 `ace.min.js`，PB 交互：
```powerbuilder
// 设置代码
uo_1.of_eval("editor.setValue(`" + ls_code + "`)")
// 获取代码
ls_return = uo_1.of_executejs("editor.getValue()")
```

### 嵌入富文本编辑器（TinyMCE）

HTML 引入 TinyMCE，PB 交互：
```powerbuilder
// 加载 Word 文档
uo_1.of_eval("PBEditor.loadWord('https://file//" + ls_path + "')")
// 获取 HTML 内容
ls_return = uo_1.of_executejs("PBEditor.getContent()")
```

### 嵌入 H5DW 数据窗口

HTML 引入 `satreport.js` 等库，PB 交互：
```powerbuilder
// 加载 PB 数据窗口定义
ls_js = "(async ()=> {" + &
    "let syntax = `" + ls_syntax + "`;" + &
    "let ob = parseDW(syntax);" + &
    "await dwMain.setDataObject(ob);" + &
    "})()"
uo_1.of_eval(ls_js)

// 设置数据
ls_data = string(n_api.of_dw2json(lds_tmp))
ls_js = "(async ()=> {" + &
    "let value = " + ls_data + ";" + &
    "dwMain.data = value.data;" + &
    "})()"
uo_1.of_eval(ls_js)

// 导出 Excel 并通过 _OnPBEvent 回传 PB
ls_js = "exportXlsx(dwMain,{callback:(buffer)=>{" + &
    "_OnPBEvent('saveas', atobase64(buffer))" + &
    "}});"
uo_1.of_eval(ls_js)
```

### 嵌入 Vue/Element UI 页面

HTML 引入 Vue + Element UI，PB 通过 `of_eval` 与 Vue 实例交互。

## 完整窗口模板

```powerbuilder
$PBExportHeader$w_example.srw
forward
global type w_example from window
end type
type uo_web from u_webview within w_example
end type
end forward

global type w_example from window
integer width = 4265
integer height = 2856
boolean titlebar = true
string title = "示例窗口"
boolean controlmenu = true
boolean minbox = true
boolean maxbox = true
boolean resizable = true
boolean center = true
uo_web uo_web
end type
global w_example w_example

on w_example.create
this.uo_web = create uo_web
this.Control[] = {this.uo_web}
end on

on w_example.destroy
destroy(this.uo_web)
end on

event open
uo_web.of_navigate("file://" + gs_dir + '\web\index.html')
end event

event resize
uo_web.resize(newwidth, newheight)
end event

event navigationcompleted
uo_web.of_eval("initApp()")
end event

event onpbevent
// 处理 JS 回调: id=请求ID, req=JSON数组数据
end event
```

## 注意事项

1. `gs_dir` 全局变量存储应用目录，路径中 `\` 需替换为 `/`
2. `of_eval` 中异步代码必须用 `(async ()=> { ... })()` IIFE 包装
3. PB 变量拼接进 JS 时注意转义，字符串用反引号或引号包裹
4. `~r~n` 是 PB 中的换行符，构建多行 JS 时使用
5. 窗口 Resize 事件中必须调用 `uo.resize()` 让 webview 自适应
6. `NavigationCompleted` 事件适合做页面初始化
7. constructor 自动创建 webview，destructor 自动销毁
8. 应用启动时需调用 `SetProcessDPIAware()` 确保高 DPI 兼容
9. 调试时可调用 `uo.of_opendevtools()` 打开开发者工具
10. **PB 10+ 必须为 satwebview.dll 的字符串参数函数添加 `alias for "函数名;Ansi"`**，否则 Unicode 字符串会导致乱码或崩溃。仅参数含 `string` 的函数需要，纯 `ulong`/`long` 参数的函数不需要
11. **Control[] 数组顺序决定层叠关系**：PB 中 Control[] 数组靠前的控件绘制在上层。当窗口中 u_webview 覆盖全窗口时，按钮等普通控件**必须放在 u_webview 前面**，否则会被 webview 遮挡不可见。正确顺序：`this.Control[] = {this.cb_1, this.uo_web}`

## 应用对象初始化模板

```powerbuilder
// Application Open 事件
on test.create
  appname = "test"
end on

event open
  long ll_pos
  string ls_path
  long ll_result
  if handle(GetApplication()) <> 0 then
    SetProcessDPIAware()
    ls_path = Space(260)
    ll_result = GetModuleFileNameA(0, ls_path, 260)
    if ll_result > 0 then
      ls_path = Left(ls_path, ll_result)
      // 去掉文件名	
      ls_path = Left(ls_path, LastPos(ls_path, "\"))
    end if
    gs_dir = ls_path
  else
    gs_dir = getcurrentdirectory()
  end if
    
  do while true
    ll_pos = pos(gs_dir, "\", 1)
    if ll_pos = 0 then exit
    gs_dir = replace(gs_dir, ll_pos, 1, "/")
  loop
    
  open(w_main)
end event
```
### 外部函数定义如下：
```
SubRoutine SetProcessDPIAware() LIBRARY "user32.dll"
Function ulong GetModuleFileNameA(ulong hModule, ref string lpFilename, ulong nSize) LIBRARY "kernel32.dll" alias for "GetModuleFileNameA"
```
