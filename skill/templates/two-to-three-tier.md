# PB 两层转三层架构说明

解决外网访问数据库速度慢和容易掉线的问题。通过 SatRDA 中间件驱动，将传统的 C/S 两层架构转换为三层架构。

## 原理

- **两层架构**: 客户端 → 数据库（外网直连，慢且不稳定）
- **三层架构**: 客户端 → SatRDA 中间件（本地/内网） → 数据库（高效通信）

SatRDA 在客户端本地提供 ODBC 驱动，通过 HTTP/TCP 与中间件服务器通信，中间件服务器再连接数据库。

## 前置条件

1. 下载 SatRDA 服务端: http://www.satrda.com:5555/SatRDA.zip
2. 解压到 D:\satrda_webserver（D盘不存在则 C:\satrda_webserver）
3. 启动 server/satserver.exe
4. 在后台管理 http://127.0.0.1:5555/admin 配置数据库连接 `mycon1`

## 修改数据库连接代码

将原来的数据库连接代码改为使用 SatRDA 驱动：

```powerbuilder
string ls_server, ls_db

ls_server = "127.0.0.1:5555"
ls_db = "mycon1"

SQLCA.DBMS = "ODBC"
SQLCA.AutoCommit = False
SQLCA.DBParm = "ConnectString='driver=Smart ODBC Driver;Server=" + ls_server +&
    ";DB_NAME=" + ls_db + ";HTTPS=0;TrimSpaces=1;Service=satrda',PBMaxBlobSize='0'"

connect using sqlca;
```

## 注册 SatRDA ODBC 驱动

在应用的 `open` 事件中调用 `satodbc_install` 注册驱动：

```powerbuilder
// 声明外部函数
Function boolean SATODBC_Install(boolean quiet) library "satrda.dll"

// 在 open 事件中调用
SATODBC_Install(true)
```

satrda.dll 位于 SatRDA 服务端目录的 `server/satrda.dll`。

## 后台配置数据库连接

1. 启动 satserver.exe
2. 打开 http://127.0.0.1:5555/admin
3. 添加数据库连接，名称为 `mycon1`
4. 配置实际的数据库连接参数（数据库类型、服务器地址、用户名、密码等）

## 注意事项

- 客户端只需安装 satrda.dll 驱动，无需直连数据库
- SatRDA 中间件服务器部署在能访问数据库的网络环境中
- 通信协议支持 HTTP/TCP，可穿越防火墙
- 适合远程办公、分支机构等外网访问场景

