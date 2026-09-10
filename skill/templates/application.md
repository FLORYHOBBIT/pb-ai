# Application 对象源码模板

文件路径: `pb_ai_src/<pbl名>/<应用名>.sra`

```powerbuilder
forward
global type app from application
end type
global transaction sqlca
global dynamicdescriptionarea sqlda
global dynamicstagingarea sqlsa
global error error
global message message
end forward

global variables
//全局变量
long gl_val 
end variables
global type app from application
string appname = "app"
end type
global app app

on app.create
appname="app"
message=create message
sqlca=create transaction
sqlda=create dynamicdescriptionarea
sqlsa=create dynamicstagingarea
error=create error
end on

on app.destroy
destroy(sqlca)
destroy(sqlda)
destroy(sqlsa)
destroy(error)
destroy(message)
end on

event open;
open(w_main)
end event
```

