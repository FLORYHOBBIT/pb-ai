# Window 对象源码模板

文件路径: `pb_ai_src/<pbl名>/w_main.srw`

## 重要：Control[] 数组顺序决定控件层叠关系

PowerBuilder 中 `Control[]` 数组的顺序决定控件的 **z-order（层叠顺序）**：**数组中靠后的控件会被靠前的控件遮挡**（即排在前面的控件绘制在上层）。

当窗口中同时存在全区域覆盖的控件（如 `u_webview`）和普通控件（如按钮）时，**必须将普通控件放在 `Control[]` 数组的前面**，全区域控件放在后面，否则普通控件会被遮挡无法点击。

**正确示例**（按钮在前，webview 在后）：
```powerbuilder
this.Control[] = {this.cb_editor, &   // 按钮在前（上层）
                  this.uo_web}         // webview 在后（下层）
```

**错误示例**（webview 在前会遮挡按钮）：
```powerbuilder
this.Control[] = {this.uo_web, &       // webview 在前（上层）-> 遮挡下方所有控件！
                  this.cb_editor}       // 按钮在后（下层）-> 被 webview 遮挡，不可见不可点击
```

## 窗口模板

```powerbuilder
forward
global type w_main from window
end type
type dw_1 from datawindow within w_main
end type
type cb_2 from commandbutton within w_main
end type
type cb_1 from commandbutton within w_main
end type
end forward

global type w_main from window
integer width = 4937
integer height = 2648
boolean titlebar = true
string title = "Untitled"
boolean controlmenu = true
boolean minbox = true
boolean maxbox = true
boolean resizable = true
long backcolor = 67108864
string icon = "AppIcon!"
boolean center = true
dw_1 dw_1
cb_2 cb_2
cb_1 cb_1
end type
global w_main w_main

type variables
//实例变量
long il_tmp
end variables

on w_main.create
this.dw_1=create dw_1
this.cb_2=create cb_2
this.cb_1=create cb_1
this.Control[]={this.dw_1,&
this.cb_2,&
this.cb_1}
end on

on w_main.destroy
destroy(this.dw_1)
destroy(this.cb_2)
destroy(this.cb_1)
end on

event open;// 窗口打开事件
end event

type dw_1 from datawindow within w_main
integer x = 142
integer y = 456
integer width = 3529
integer height = 1500
integer taborder = 20
string title = "none"
string dataobject = "d_lisjk"
boolean livescroll = true
borderstyle borderstyle = stylelowered!
end type

event itemchanged;// 数据改变事件
end event

type cb_2 from commandbutton within w_main
integer x = 654
integer y = 48
integer width = 448
integer height = 128
integer taborder = 20
integer textsize = -12
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Tahoma"
string text = "检索数据"
end type

event clicked;
dw_1.SetTransObject(SQLCA)
dw_1.retrieve()

end event

type cb_1 from commandbutton within w_main
integer x = 133
integer y = 44
integer width = 457
integer height = 132
integer taborder = 10
integer textsize = -12
integer weight = 400
fontcharset fontcharset = ansi!
fontpitch fontpitch = variable!
fontfamily fontfamily = swiss!
string facename = "Tahoma"
string text = "连接"
end type

event clicked;
// Profile msql
SQLCA.DBMS = "ODBC"
SQLCA.AutoCommit = False
SQLCA.DBParm = "ConnectString='DSN=mssql;UID=sa;PWD=sql123'"


Connect Using  SQLCA;

If SQLCA.SQLCode <> 0 Then
	MessageBox("提示","无法连接上数据库！！"+SQLCA.SQLErrText )
	halt
End If

MessageBox("提示","连接成功！！"  )

end event
```

