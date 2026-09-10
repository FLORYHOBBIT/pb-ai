# H5DW 报表制作 AI 技能指南

## 概述

本文档提供H5DW（HTML5 DataWindow）报表系统的完整制作指南，帮助AI理解和创建各种类型的报表。H5DW是基于PowerBuilder DataWindow概念的Web报表解决方案，支持多种报表类型和复杂的数据展示需求。

---

## 一、报表文件结构

### 1.1 基本结构

每个报表文件是一个JSON对象，包含以下主要部分：

```json
{
  "units": 0,              // 单位类型（0:像素）
  "processing": 1,         // 处理模式（1:常规报表）
  "table": { ... },        // 数据源配置
  "reportData": { ... }    // 报表展现配置
}
```

### 1.2 数据源配置（table）

```json
"table": {
  "retrieve": "SQL查询语句",           // 检索数据的SQL
  "update": "表名",                    // 更新的目标表
  "updatewhere": 2,                    // 更新条件策略（0:主键, 1:主键+更新列, 2:主键+修改列）
  "updatekeyinplace": true,            // 是否就地更新主键
  "columns": [                         // 列定义数组
    {
      "name": "字段名",                 // 字段名称（用于报表引用）
      "dbname": "数据库字段名",         // 数据库中的实际字段名
      "type": "数据类型",               // string/long/number/datetime/bool
      "key": false,                     // 是否为主键
      "update": true,                   // 是否可更新
      "label": "显示标签"               // 列的显示标签
    }
  ],
  "arguments": [                       // 可选：SQL参数定义
    { "arg": "参数名", "type": "类型" }
  ]
}
```

**数据类型说明：**
- `string`: 字符串类型
- `long`: 长整型
- `number`: 数值型（小数）
- `datetime`: 日期时间
- `bool`: 布尔值

### 1.3 报表展现配置（reportData）

```json
"reportData": {
  "name": "sheet名称",
  "freeze": "冻结单元格位置",          // 如 "A2" 表示冻结第1行和第1列
  "styles": [                          // 样式数组（索引从0开始）
    {
      "border": {                      // 边框配置
        "top": ["thin", "#bfbfbf"],   // [线型, 颜色]
        "bottom": ["thin", "#bfbfbf"],
        "left": ["thin", "#bfbfbf"],
        "right": ["thin", "#bfbfbf"]
      },
      "bgcolor": "#e9e9e9",           // 背景色
      "align": "center",              // 对齐方式：left/center/right
      "font": {                        // 字体配置
        "size": 14,                   // 字号
        "bold": true,                 // 粗体
        "italic": false               // 斜体
      }
    }
  ],
  "merges": ["A1:H1"],                // 合并单元格区域数组
  "rows": {                            // 行配置
    "0": {                             // 行号（从0开始）
      "height": 39,                    // 行高
      "cells": {                       // 单元格配置
        "0": {                         // 列号（从0开始）
          "text": "单元格内容",         // 文本内容或公式
          "style": 3,                  // 引用styles数组的索引
          "edit": {                    // 编辑属性（可选）
            "style": "columnheader",  // 编辑类型
            "attrs": { ... }          // 属性配置
          }
        }
      }
    },
    "len": 行数,                       // 总行数
    "height": 默认行高,
    "minHeight": 最小行高
  },
  "cols": {                            // 列配置
    "0": { "width": 120 },            // 列宽
    "len": 总列数
  },
  "report": {                          // 报表区域配置
    "calc": true,                      // 是否启用计算
    "bands": [                         // 区域定义
      {
        "start": 起始行号,             // 从0开始的行索引
        "len": 区域行数,
        "name": "区域名称",            // header/detail/trailer/header.N/trailer.N
        "level": 分组级别              // 仅分组区域需要
      }
    ],
    "group": [                         // 分组配置（可选）
      {
        "level": 1,                    // 分组级别
        "by": ["字段名"]               // 分组字段
      }
    ]
  },
  "validations": [],                   // 验证规则
  "autofilter": {}                     // 自动筛选配置
}
```

---

## 二、单元格内容语法

### 2.1 静态文本

直接填写文本内容：
```json
"text": "客户基本信息"
```

### 2.2 数据绑定

使用 `#{}` 语法绑定数据源字段：
```json
"text": "#{CustomerID}"              // 显示CustomerID字段值
"text": "#{CompanyName}"            // 显示CompanyName字段值
```

### 2.3 表达式计算

支持在 `#{}` 中使用表达式：
```json
"text": "#{'ID为：' + CustomerID}"                    // 字符串拼接
"text": "#{UnitPrice * Quantity}"                     // 数学运算
"text": "#{'运费:' + Freight}"                        // 混合文本
"text": "#{Discount * Amount}"                        // 折扣计算
"text": "#{Amount - Discount * Amount}"               // 折扣后金额
```

### 2.4 聚合函数

#### 分组汇总
```json
"text": "#{sum(Amount for group 1)}"                  // 分组1的Amount总和
"text": "#{count(City for group 3)}"                  // 分组3的City计数
"text": "#{avg(Price for group 2)}"                   // 分组2的平均值
"text": "#{max(Amount for group 1)}"                  // 分组1的最大值
"text": "#{min(Amount for group 1)}"                  // 分组1的最小值
```

#### 全局汇总
```json
"text": "#{sum(grand_sum_amount for all)}"            // 所有数据的总和
```

#### 交叉表汇总
```json
"text": "#{crosstabsum('amount')}"                    // 交叉表当前行汇总
```

### 2.5 特殊占位符

交叉表列标题：
```json
"text": "@productname"                                // 交叉表动态列标题
```

---

## 三、报表区域（Bands）

### 3.1 区域类型

| 区域名称 | 说明 | 用途 | 必须填写 |
|---------|------|------|
| `header` | 报表头 | 只显示一次，通常在顶部 | 是（start和len可以同时为0） |
| `detail` | 明细区 | 根据数据行数自动重复 | 是 （start和len可以同时为0）|
| `trailer` | 报表尾 | 只显示一次，通常在底部 | 否 |
| `header.N` | 分组头N | 第N级分组的表头，每组显示一次 | 否 |
| `trailer.N` | 分组尾N | 第N级分组的表尾，每组显示一次 | 否 |

### 3.2 区域配置示例

#### 简单报表（无分组）
```json
"bands": [
  { "start": 0, "len": 1, "name": "header" },     // 第0行：报表头
  { "start": 1, "len": 1, "name": "detail" }       // 第1行：明细（自动扩展）
]
```

#### 单分组报表
```json
"bands": [
  { "start": 0, "len": 1, "name": "header" },      // 报表头
  { "start": 1, "len": 1, "name": "header.1", "level": 1 },  // 分组1表头
  { "start": 2, "len": 1, "name": "detail" },      // 明细
  { "start": 3, "len": 1, "name": "trailer.1", "level": 1 }  // 分组1表尾
]
```

#### 多级分组报表
```json
"bands": [
  { "start": 0, "len": 1, "name": "header" },      // 报表头
  { "start": 1, "len": 1, "name": "header.1", "level": 1 },  // 分组1表头
  { "start": 2, "len": 1, "name": "header.2", "level": 2 },  // 分组2表头
  { "start": 3, "len": 1, "name": "header.3", "level": 3 },  // 分组3表头
  { "start": 4, "len": 1, "name": "detail" },      // 明细
  { "start": 5, "len": 1, "name": "trailer.3", "level": 3 }, // 分组3表尾
  { "start": 6, "len": 1, "name": "trailer.2", "level": 2 }, // 分组2表尾
  { "start": 7, "len": 1, "name": "trailer.1", "level": 1 }  // 分组1表尾
]
```

---

## 四、报表类型详解

### 4.1 常规报表（Common Report）

**特点：** 最简单的报表形式，直接展示数据列表

**适用场景：** 客户列表、产品清单等简单表格

**制作步骤：**
1. 定义数据源（SQL查询）
2. 设计表头（header区域）
3. 设计明细行（detail区域），使用 `#{字段名}` 绑定数据
4. 可选：添加报表尾（trailer区域）

```json
{
  "table": {
    "retrieve": "select * from customers",
    "columns": [
      { "name": "CustomerID", "type": "string", "label": "客户编号" },
      { "name": "CompanyName", "type": "string", "label": "公司名称" }
    ]
  },
  "reportData": {
    "rows": {
      "0": { "cells": { "0": { "text": "客户编号" } } },  // 表头
      "1": { "cells": { "0": { "text": "#{CustomerID}" } } }  // 明细
    },
    "report": {
      "bands": [
        { "start": 0, "len": 1, "name": "header" },
        { "start": 1, "len": 1, "name": "detail" }
      ]
    }
  }
}
```

---

### 4.2 分组报表（Group Report）

**特点：** 按指定字段分组，支持分组汇总

**适用场景：** 按订单分组的销售明细、按部门分组的员工列表

**关键配置：**
- 在 `report.group` 中定义分组字段
- 使用 `header.N` 和 `trailer.N` 区域
- 在分组尾使用聚合函数进行汇总

**示例：**

```json
{
  "reportData": {
    "report": {
      "group": [
        { "level": 1, "by": ["OrderID"] }  // 按OrderID分组
      ],
      "bands": [
        { "start": 0, "len": 1, "name": "header" },
        { "start": 1, "len": 1, "name": "header.1", "level": 1 },
        { "start": 2, "len": 1, "name": "detail" },
        { "start": 3, "len": 1, "name": "trailer.1", "level": 1 }
      ]
    },
    "rows": {
      "1": { "cells": { "0": { "text": "#{OrderID}" } } },  // 分组头显示分组字段
      "3": { "cells": { "0": { "text": "#{sum(Amount for group 1)}" } } }  // 分组尾汇总
    }
  }
}
```

**多级分组：**
```json
"report": {
  "group": [
    { "level": 1, "by": ["Country"] },   // 第一级：国家
    { "level": 2, "by": ["Region"] },    // 第二级：地区
    { "level": 3, "by": ["City"] }       // 第三级：城市
  ]
}
```

---

### 4.3 树型分组报表（Tree Group Report）

**特点：** 分组以树形结构展示，可展开/折叠

**适用场景：** 层级数据展示，如组织架构、地区分级

**制作方法：**
1. 配置多级分组（同分组报表）
2. 在分组头单元格设置 `edit.style` 为 `"tree"`

**示例：**

```json
{
  "rows": {
    "2": {
      "cells": {
        "0": {
          "text": "#{'国家:' + Country}",
          "edit": { "style": "tree" }  // 设置为树节点
        }
      }
    },
    "3": {
      "cells": {
        "0": {
          "text": "#{'  区域:' + Region}",
          "edit": { "style": "tree" }  // 设置为树节点
        }
      }
    }
  }
}
```

---

### 4.4 树型列表报表（Tree View Report）

**特点：** 基于parentId/id关系的树形结构，非分组实现

**适用场景：** 部门树、菜单树、分类树

**数据要求：** 必须包含 `id` 和 `parentId` 字段

**制作方法：**
1. 配置 `reportData.tree` 属性指定 `parentId` 和 `id` 字段
2. 在单元格设置 `edit.style` 为 `"tree"`

**示例数据结构：**
```javascript
[
  {"deptId": 100, "parentId": 0, "dept_name": "总公司"},
  {"deptId": 101, "parentId": 100, "dept_name": "分公司"}
]
```


---

### 4.5 交叉表报表（Crosstab Report）

**特点：** 行列动态转换，类似Excel透视表

**适用场景：** 销售分析、数据统计对比

**关键配置：**
- 设置 `processing` 为交叉表模式
- 定义 rows（行）、columns（列）、values（值）
- 使用 `@字段名` 显示动态列标题
- 使用 `crosstabsum()` 进行汇总


```json
{
  "processing": 2,  // 交叉表模式
  "reportData": {
    "report": {
      "crosstab": {
        "rows": ["customerid", "companyname"],
        "columns": ["productname"],
        "values": ["amount"]
      }
    },
    "rows": {
      "cells": {
        "0": { "text": "@productname" },           // 动态列标题
        "1": { "text": "#{crosstabsum('amount')}" } // 交叉表汇总
      }
    }
  }
}
```

---

### 4.6 带筛选排序的报表

**特点：** 支持列排序和过滤功能

**适用场景：** 需要交互式数据浏览的报表

**制作方法：**
在表头单元格设置 `ColumnHeader` 类型：

```json
{
  "cells": {
    "0": {
      "text": "客户编号",
      "edit": {
        "style": "columnheader",
        "attrs": {
          "column": "CustomerID",    // 关联的字段名
          "sortable": true,           // 允许排序
          "filterable": true,         // 允许过滤
          "draggroup": 0              // 拖拽分组（>=0允许拖拽交换）
        }
      }
    }
  }
}
```


---

### 4.7 图片报表

**特点：** 单元格显示图片

**适用场景：** 产品展示、头像显示

**图片来源类型：**
- `url`: 从网络URL获取
- `base64`: 从Base64编码数据获取

**制作方法：**
```json
{
  "cells": {
    "0": {
      "text": "#{ImageData}",  // 数据源返回图片数据，也可以直接用url或者base64同image标签的src属性
      "edit": {
        "style": "image",
        "attrs": {
          "from": "base64"  // 或 "url"
        }
      }
    }
  }
}
```


---

### 4.8 条码/二维码报表

**特点：** 生成条形码或二维码

**适用场景：** 商品标签、票据打印

**制作方法：**
```json
{
  "cells": {
    "0": {
      "text": "#{ProductCode}",  // 条码内容
      "edit": {
        "style": "BarCode"  // 或 "QRCode" 表示二维码
      }
    }
  }
}
```


---

### 4.9 HTML单元格报表

**特点：** 单元格渲染HTML内容，支持Vue组件

**适用场景：** 富文本展示、交互式控件、自定义UI

#### 普通HTML模式

```json
{
  "cells": {
    "0": {
      "text": "<label>{{'v1:' + value1 + ' v2:' + value2}}</label>",
      "edit": {
        "style": "html"
      }
    }
  }
}
```

#### Vue模式

需要页面引入Vue.js和相关组件库：

```json
{
  "cells": {
    "0": {
      "text": "<el-switch v-model='value1' active-text='按月付费'></el-switch>",
      "edit": {
        "style": "html",
        "attrs": {
          "vue": "vue2"  // 或 "vue3"
        }
      }
    }
  }
}
```

**事件响应：**

监听 `CellHtmlEvent` 事件：
```javascript
dw.on('CellHtmlEvent', (evt, row, name, key, ...args) => {
  if (key === 'bt') {
    console.log('按钮被点击', row);
  }
});
```


---

### 4.10 自绘报表（Paint Report）

**特点：** 通过Canvas API自定义绘制内容

**适用场景：** 体温单、图表、特殊图形

**制作方法：**
1. 合并多个单元格作为绘制区域
2. 设置单元格类型为 `Paint`
3. 在 `CellRender` 事件中绘制

```json
{
  "cells": {
    "0": {
      "text": "",
      "edit": {
        "style": "paint"
      }
    }
  }
}
```

**JavaScript绘制代码：**
```javascript
dw.on('CellRender', (evt, row, name, draw) => {
  const { npx, dpr, ctx } = draw;
  const { left, top, width, height } = evt.view;
  
  ctx.save();
  ctx.scale(dpr(), dpr());
  
  // 绘制矩形
  ctx.beginPath();
  ctx.rect(left + 20, top + 40, 200, 80);
  ctx.strokeStyle = '#ff0000';
  ctx.fillStyle = "blue";
  ctx.stroke();
  ctx.fill();
  
  ctx.restore();
});
```


---

### 4.11 多数据源报表

**特点：** 一个报表展示多个数据源

**适用场景：** 综合报表、主从表展示

**制作方法：**
1. 定义多个数据源
2. 使用"块设置"指定不同区域使用的数据源
3. 设置块类型为 `Row Loop`


---

### 4.12 分组多级合并报表

**特点：** 跨分组的单元格合并

**适用场景：** 复杂的分组统计报表

**制作方法：**
1. 配置多级分组
2. 选中需要合并的单元格
3. 设置 `rowMerge` 属性为 `true`

```json
{
  "cells": {
    "0": {
      "text": "#{Region}",
      "rowMerge": true  // 启用行合并
    }
  }
}
```

---

### 4.13 下拉列表框（DropDownListBox）

**特点：** 单元格编辑时弹出下拉列表，用户从预定义选项中选择

**适用场景：** 性别、状态、类型等有限选项的字段

**配置方式：**

```json
{
  "cells": {
    "1": {
      "text": "#{status}",
      "edit": {
        "style": "dropdownlistbox",
        "attrs": {
          "values": [
            { "key": "启用", "value": "1" },
            { "key": "禁用", "value": "0" }
          ]
        }
      }
    }
  }
}
```

**配置说明：**

| 属性 | 说明 |
|------|------|
| `values[].key` | 下拉列表中**显示**的文本 |
| `values[].value` | 选中后实际**存储**的值 |

**值映射规则：**
- 下拉列表显示 `key`（如"启用""禁用"）
- 选中后单元格存储 `value`（如"1""0"）
- 单元格非编辑状态时，自动反向查找：用存储的 `value` 匹配，显示对应的 `key`

**values 的两种来源（优先级从高到低）：**
1. `cell.edit.attrs.values` —— 单元格级别定义（如上例）
2. `table.columns[].values` —— 列级别定义（该列所有单元格共用）

列级别定义示例：
```json
"table": {
  "columns": [
    {
      "name": "gender",
      "type": "string",
      "values": [
        { "key": "男", "value": "M" },
        { "key": "女", "value": "F" }
      ]
    }
  ]
}
```
此时明细行单元格只需指定编辑风格，无需重复定义 values：
```json
{
  "cells": {
    "0": {
      "text": "#{gender}",
      "edit": { "style": "dropdownlistbox" }
    }
  }
}
```

**交互行为：**
- 点击单元格或按 F2 打开编辑器，自动弹出下拉列表
- 单元格右侧显示下拉箭头，点击可切换下拉的展开/收起
- 支持键盘操作：↑↓ 选择、Enter 确认、Esc 关闭
- 选中后触发 `DropDownSelected` 和 `ItemChanged` 事件

---

### 4.14 下拉数据窗口（DropDownDW）

**特点：** 单元格编辑时弹出一个完整的子 DataWindow 作为下拉选择器，支持多列显示、数据过滤

**适用场景：** 选项数据量大、需要多列展示、需要动态检索的选择场景（如选择客户、选择产品）

**配置方式：**


#### 配置单元格编辑属性

```json
{
  "cells": {
    "0": {
      "text": "#{customer_id}",
      "edit": {
        "style": "dropdowndw",
        "attrs": {
          "name": "ddw_customers",
          "dataColumn": "id",
          "displayColumn": "name"
        }
      }
    }
  }
}
```

**attrs 属性说明：**

| 属性 | 必须 | 说明 |
|------|------|------|
| `name` | 是 | 子数据窗口名称（对应 `reportData.child` 中的 key） |
| `dataColumn` | 是 | 选中后存储的字段（子DW中的列名） |
| `displayColumn` | 是 | 单元格显示的字段（子DW中的列名） |
| `filterColumns` | 否 | 输入过滤时匹配的列（默认用 displayColumn和 dataColumn列） |
| `lines` | 否 | 下拉窗口显示的行数 |
| `percentWidth` | 否 | 下拉窗口宽度占父容器百分比 |
| `allowEdit` | 否 | 是否允许在下拉窗口中编辑 |

**值映射规则：**
- 下拉窗口显示子 DataWindow 的完整数据（多列）
- 用户点击某行后，存储该行 `dataColumn` 的值
- 单元格非编辑状态时，在子 DW 数据中查找 `dataColumn` 匹配的记录，显示其 `displayColumn` 的值



**交互行为：**
- 点击单元格弹出子 DataWindow 下拉面板
- 支持在输入框中输入文字进行数据过滤
- 支持键盘操作：↑↓ 移动行、Enter 确认选择、Esc 关闭
- 点击子 DW 中的某行即完成选择
- 选中后触发 `DropDownSelected` 和 `ItemChanged` 事件

**与 dropdownlistbox 的选择指南：**

| 对比项 | dropdownlistbox | dropdowndw |
|--------|----------------|------------|
| 选项来源 | 静态 values 数组 | 动态数据检索（子 DataWindow） |
| 显示列 | 单列 | 多列（完整表格） |
| 数据量 | 少量固定选项（<50） | 大量动态数据 |
| 配置复杂度 | 简单（内联 values） | 较复杂（需定义子 DW + 回调） |
| 典型场景 | 性别、状态、类型 | 客户选择、产品选择 |

---

## 五、单元格类型

H5DW支持多种单元格类型，通过 `edit.style` 配置。渲染型类型的详细说明见 [CELL_TYPES_SKILL.md](CELL_TYPES_SKILL.md)。

### 快速索引

| 单元格类型 | 配置值 | 说明 |
|-----------|--------|------|
| 普通文本 | 无或空 | 默认类型，纯文本显示 |
| Tree树型 | `"tree"` | 树形结构节点 |
| ColumnHeader列头 | `"columnheader"` | 支持排序/过滤/拖拽 |
| Image图片 | `"image"` | 显示图片（url/base64） |
| BarCode条码 | `"BarCode"` | 条形码 |
| QRCode二维码 | `"QRCode"` | 二维码 |
| HTML富文本 | `"html"` | HTML/Vue组件渲染 |
| Paint自绘 | `"paint"` | Canvas自定义绘制 |
| **DropDownListBox** | `"dropdownlistbox"` | **下拉列表框（见 4.13 节）** |
| **DropDownDW** | `"dropdowndw"` | **下拉数据窗口（见 4.14 节）** |

各类型的详细配置和示例见 [CELL_TYPES_SKILL.md](CELL_TYPES_SKILL.md)。

---

## 六、样式系统

### 6.1 样式定义

样式在 `reportData.styles` 数组中定义，通过索引引用：

```json
"styles": [
  {
    "border": {
      "top": ["thin", "#bfbfbf"],
      "bottom": ["thin", "#bfbfbf"],
      "left": ["thin", "#bfbfbf"],
      "right": ["thin", "#bfbfbf"]
    },
    "bgcolor": "#e9e9e9",
    "align": "center",
    "font": {
      "size": 14,
      "bold": true,
      "color": "#333333"
    }
  }
]
```

### 6.2 边框线型

- `thin`: 细线
- `medium`: 中线
- `thick`: 粗线
- `dashed`: 虚线
- `dotted`: 点线

### 6.3 对齐方式

- `left`: 左对齐
- `center`: 居中
- `right`: 右对齐

### 6.4 引用样式

``json
"cells": {
  "0": {
    "text": "内容",
    "style": 0  // 引用styles[0]
  }
}
```

---

## 七、单元格合并

### 7.1 合并语法

``json
"merges": ["A1:H1", "B3:C3"]  // Excel风格的合并区域
```

### 7.2 坐标系统

- 列用字母表示：A=0, B=1, C=2...
- 行用数字表示：1=第1行, 2=第2行...
- `A1:H1` 表示第1行的A列到H列

---

## 八、冻结单元格

### 8.1 冻结配置

``json
"freeze": "A2"  // 冻结第1行和第1列
```

**常见冻结位置：**
- `"A1"`: 不冻结
- `"A2"`: 冻结第1行
- `"B1"`: 冻结第1列
- `"B2"`: 冻结第1行和第1列

---

## 九、带参数的报表

### 9.1 定义参数

在 `table.arguments` 中定义：

```json
"table": {
  "retrieve": "select * from customers where CustomerID = :id",
  "arguments": [
    { "arg": "id", "type": "string" }
  ]
}
```

### 9.2 检索时传参

```javascript
await dw.retrieve(customerId);
```


---

## 十、常用API操作

### 10.1 创建报表

```javascript
// 创建DataWindow实例
const dw = new DataWindow('#container');

// 设置报表定义
dw.dataObject = reportJson;

// 或异步加载
await dw.setDataObject(reportJson);
```

### 10.2 检索数据

```javascript
// 无参数检索
const count = await dw.retrieve();

// 带参数检索
const count = await dw.retrieve(param1, param2);
```

### 10.3 数据操作

```javascript
// 获取行数
const rowCount = dw.rowCount();

// 获取/设置单元格值
const value = dw.getItem(1, 'CustomerID');
dw.setItem(1, 'CompanyName', '新公司名');

// 插入/删除行
const newRow = dw.insertRow(0);  // 末尾插入
dw.deleteRow(1);                 // 删除第1行
```

### 10.4 事件监听

```javascript
dw.on('ItemChanged', (evt, row, dwo, data) => {
  console.log('数据改变', row, data);
});
```

完整事件列表和参数说明见 [EVENT_PARAMETERS.md](EVENT_PARAMETERS.md)。

### 10.5 自定义事件（eventScript / events）

在 `dataObject` 中通过 `eventScript` 或 `events` 属性定义业务事件逻辑，无需外部 `dw.on()` 调用：

```javascript
const dataObject = {
  table: { /* ... */ },
  // 方式1：eventScript（推荐，支持共享变量和辅助函数）
  eventScript: `
    let count = 0;
    function on_Clicked(evt, row, cell) { count++; }
    function on_ItemChanged(evt, row, cell, text) { /* 验证逻辑 */ }
  `,
  // 方式2：events 对象（简单一行式处理器）
  events: {
    'Clicked': "console.log('clicked row:', row);"
  }
};
```

详细用法、支持的事件列表、参数表、API 和调试方法见 [自定义事件文档](CUSTOM_EVENTS_README.md)。

### 10.6 自定义函数（functions）

在 `dataObject.functions` 中定义业务函数，可在报表公式、`evaluate()`、过滤条件中使用：

```javascript
const dataObject = {
  table: { /* ... */ },
  functions: {
    netAmount: function(price, qty, discount) { return price * qty * (1 - discount); },
    addTax: "return Math.round(value * 1.13 * 100) / 100;",
    mid: { params: ['str', 'start', 'length'], code: 'return String(str).substr(start - 1, length);' }
  }
};

await dw.setDataObject(dataObject);
dw.evaluate('netAmount(price, quantity, discount)', 0);  // 在公式中调用
```

三种定义格式、参数传递规则、序列化、查找优先级见 [自定义函数文档](CUSTOM_FUNCTIONS_README.md)。

### 10.7 打印报表

```javascript
dw.print({
  orientation: 'portrait',  // 纵向
  paperSize: 'A4',
  margin: {
    left: '20mm',
    right: '20mm',
    top: '20mm',
    bottom: '20mm'
  }
});
```

---

## 十一、报表制作流程

1. **确定需求** — 报表类型、数据源、展示字段、是否分组/汇总
2. **设计数据源** — `table.retrieve` + `table.columns`
3. **规划布局** — 行列数、区域（header/detail/trailer）、分组
4. **定义样式** — styles 数组（边框、背景色、对齐）
5. **构建单元格** — 逐行定义 text/公式/数据绑定，应用 style
6. **配置区域** — `report.bands` + `report.group`
7. **测试** — 检查数据绑定、公式计算、样式布局

### 快速模板（简单列表）

``json
{
  "units": 0,
  "processing": 1,
  "table": {
    "retrieve": "SELECT * FROM table_name",
    "columns": [
      { "name": "col1", "type": "string", "label": "列1" },
      { "name": "col2", "type": "number", "label": "列2" }
    ]
  },
  "reportData": {
    "name": "sheet1",
    "freeze": "A2",
    "styles": [
      { "border": { "bottom": ["thin", "#ccc"] } },
      { "bgcolor": "#f0f0f0", "align": "center" }
    ],
    "rows": {
      "0": { "cells": { "0": { "text": "列1", "style": 1 }, "1": { "text": "列2", "style": 1 } } },
      "1": { "cells": { "0": { "text": "#{col1}", "style": 0 }, "1": { "text": "#{col2}", "style": 0 } } },
      "len": 2, "height": 25
    },
    "cols": { "0": { "width": 150 }, "1": { "width": 150 }, "len": 2 },
    "report": {
      "calc": true,
      "bands": [
        { "start": 0, "len": 1, "name": "header" },
        { "start": 1, "len": 1, "name": "detail" }
      ]
    }
  }
}
```

---

## 十二、常见问题

| 问题 | 常见原因 | 解决方法 |
|------|----------|----------|
| 数据不显示 | 字段名拼写错误 / SQL无数据 / 绑定语法错 | 检查 `#{name}` 与 columns.name 一致 |
| 汇总不正确 | 分组级别错误 / 字段名错 | `for group N` 的 N 须与 group level 对应 |
| 样式不生效 | style 索引越界 / 属性名拼写错 | 确认索引在 styles 数组范围内 |
| 分组不生效 | 未配 group / 缺 bands / 数据未排序 | 同时配置 group+bands，SQL 加 ORDER BY |

---

## 十三、参考文档

- [H5DW核心类文档](H5DW_AI_SKILL.md) — DataStore/DataWindow API
- [单元格类型指南](CELL_TYPES_SKILL.md) — 渲染型单元格详细配置
- [自定义事件](CUSTOM_EVENTS_README.md) — eventScript/events 定义、事件列表、参数、API
- [自定义函数](CUSTOM_FUNCTIONS_README.md) — functions 定义格式、公式调用、序列化
- [事件参数表](EVENT_PARAMETERS.md) — 各事件的参数说明

---

**文档版本：** 2.1  
**更新日期：** 2026-08-01  
**适用版本：** H5DW 最新版

