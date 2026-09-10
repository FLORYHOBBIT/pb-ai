# H5DW 单元格类型技能指南

## 概述

本文档详细介绍H5DW报表系统中支持的所有单元格类型，包括配置方法、使用场景和实际示例。每种单元格类型都有独特的渲染方式和交互功能，可以根据需求灵活选择。

---

## 单元格类型总览

| 类型 | 配置值 | 主要用途 | 交互性 | 复杂度 |
|------|--------|---------|--------|--------|
| 普通文本 | 无或空 | 基础数据展示 | 无 | 低 |
| Tree | `"tree"` | 树形结构展示 | 展开/折叠 | 中 |
| ColumnHeader | `"columnheader"` | 可排序过滤的表头 | 排序/过滤/拖拽 | 中 |
| Image | `"image"` | 图片显示 | 无 | 低 |
| BarCode | `"BarCode"` | 一维条码 | 无 | 低 |
| QRCode | `"QRCode"` | 二维码 | 无 | 低 |
| HTML | `"html"` | 富文本/Vue组件 | 高（可自定义） | 高 |
| Paint | `"paint"` | Canvas自定义绘制 | 高（需编程） | 高 |

---

## 1. 普通文本单元格（默认）

**特点：** 最基本的单元格类型，显示静态文本或数据绑定内容

**配置：** 无需设置 `edit` 属性，或设置为空

```json
{
  "cells": {
    "0": {
      "text": "#{CustomerID}",  // 直接显示数据
      "style": 0
    }
  }
}
```

**适用场景：** 大多数数据展示场景

**参考示例：** [`report/customers`](report/customers)

---

## 2. Tree 树型单元格

**特点：** 在单元格中显示树形展开/折叠图标，用于层级数据展示

### 2.1 基本配置

```json
{
  "cells": {
    "0": {
      "text": "#{dept_name}",
      "edit": {
        "style": "tree"
      }
    }
  }
}
```

### 2.2 两种使用场景

#### A. 树型列表（Tree View）

基于 `parentId/id` 关系的树形结构，需要在报表级别配置：

```json
{
  "reportData": {
    "report": {
      "tree": {
        "parentId": "parentId",  // 父ID字段名
        "id": "deptId"           // 当前ID字段名
      }
    }
  }
}
```

**数据要求：**
- 必须包含 `id` 和 `parentId` 字段
- `parentId` 为 0 或 null 表示根节点
- 数据可以是任意顺序，系统会自动构建树形结构

**示例数据结构：**
```javascript
[
  {"deptId": 100, "parentId": 0, "dept_name": "总公司"},
  {"deptId": 101, "parentId": 100, "dept_name": "分公司"},
  {"deptId": 103, "parentId": 101, "dept_name": "研发部"}
]
```

**完整示例：** [`report/treeview`](report/treeview)

```json
{
  "table": {
    "retrieve": "select dept_id, parent_id, dept_name from sys_dept",
    "columns": [
      { "name": "deptId", "type": "long", "dbname": "dept_id" },
      { "name": "parentId", "type": "long", "dbname": "parent_id" },
      { "name": "dept_name", "type": "string", "dbname": "dept_name" }
    ]
  },
  "reportData": {
    "rows": {
      "0": {
        "cells": {
          "0": { "text": "名称", "style": 0 }
        }
      },
      "1": {
        "cells": {
          "0": {
            "text": "#{dept_name}",
            "style": 1,
            "edit": { "style": "tree" }
          }
        }
      }
    },
    "report": {
      "tree": {
        "parentId": "parentId",
        "id": "deptId"
      },
      "bands": [
        { "start": 0, "len": 1, "name": "header" },
        { "start": 1, "len": 1, "name": "detail" }
      ]
    }
  }
}
```

#### B. 树型分组（Tree Group）

在分组报表的分组头中使用，配合多级分组实现树形展示：

```json
{
  "reportData": {
    "report": {
      "group": [
        { "level": 1, "by": ["Country"] },
        { "level": 2, "by": ["Region"] },
        { "level": 3, "by": ["City"] }
      ],
      "bands": [
        { "start": 0, "len": 1, "name": "header" },
        { "start": 1, "len": 1, "name": "header.1", "level": 1 },
        { "start": 2, "len": 1, "name": "header.2", "level": 2 },
        { "start": 3, "len": 1, "name": "header.3", "level": 3 },
        { "start": 4, "len": 1, "name": "detail" },
        { "start": 5, "len": 1, "name": "trailer.3", "level": 3 },
        { "start": 6, "len": 1, "name": "trailer.2", "level": 2 },
        { "start": 7, "len": 1, "name": "trailer.1", "level": 1 }
      ]
    },
    "rows": {
      "1": {
        "cells": {
          "0": {
            "text": "#{'国家:' + Country}",
            "edit": { "style": "tree" }  // 一级分组树节点
          }
        }
      },
      "2": {
        "cells": {
          "0": {
            "text": "#{'  区域:' + Region}",
            "edit": { "style": "tree" }  // 二级分组树节点
          }
        }
      },
      "3": {
        "cells": {
          "0": {
            "text": "#{'    城市:' + City}",
            "edit": { "style": "tree" }  // 三级分组树节点
          }
        }
      }
    }
  }
}
```

**完整示例：** [`report/treegroup`](report/treegroup)

**注意事项：**
- 树型分组需要配合分组配置使用
- 每个分组级别的表头都可以设置为树节点
- 可以通过缩进文本（如添加空格）来视觉区分层级

---

## 3. ColumnHeader 列头单元格

**特点：** 支持排序、过滤、拖拽等交互功能的表头单元格

### 3.1 基本配置

```json
{
  "cells": {
    "0": {
      "text": "客户编号",
      "edit": {
        "style": "columnheader",
        "attrs": {
          "column": "CustomerID",    // 关联的字段名
          "sortable": true,           // 是否允许排序
          "filterable": true,         // 是否允许过滤
          "draggroup": 0              // 拖拽分组（>=0允许拖拽交换位置）
        }
      }
    }
  }
}
```

### 3.2 属性说明

| 属性 | 类型 | 说明 |
|------|------|------|
| `column` | string | 关联的数据字段名，用于排序和过滤 |
| `sortable` | boolean | 是否启用点击排序功能 |
| `filterable` | boolean | 是否显示过滤图标，允许过滤 |
| `draggroup` | number | 拖拽分组编号，相同编号的列可以互相拖拽交换位置 |

### 3.3 功能说明

- **排序：** 点击列头可在升序/降序之间切换
- **过滤：** 点击过滤图标弹出过滤对话框
- **拖拽：** 相同 `draggroup` 的列可以拖拽交换位置

**完整示例：** [`report/sortfilter`](report/sortfilter)

```json
{
  "rows": {
    "1": {
      "cells": {
        "0": {
          "text": "客户编号",
          "style": 4,
          "edit": {
            "style": "columnheader",
            "attrs": {
              "column": "CustomerID",
              "sortable": true
            }
          }
        },
        "1": {
          "text": "公司名称",
          "style": 4,
          "edit": {
            "style": "columnheader",
            "attrs": {
              "column": "CompanyName",
              "sortable": true,
              "filterable": true
            }
          }
        }
      }
    }
  }
}
```

**适用场景：** 需要交互式数据浏览的报表表头

---

## 4. Image 图片单元格

**特点：** 在单元格中显示图片，支持URL和Base64两种来源

### 4.1 基本配置

```json
{
  "cells": {
    "0": {
      "text": "#{PhotoData}",  // 数据源中的图片数据
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

### 4.2 图片来源类型

| 类型 | 说明 | 数据格式 |
|------|------|----------|
| `base64` | Base64编码的图片数据 | 字符串格式的Base64编码 |
| `url` | 网络图片URL | 图片的HTTP/HTTPS地址 |

### 4.3 使用示例

#### A. Base64图片

数据源返回Base64编码的图片数据：

```json
{
  "table": {
    "retrieve": "SELECT EmployeeID, Photo FROM Employees",
    "columns": [
      { "name": "EmployeeID", "type": "long" },
      { "name": "Photo", "type": "blob" }  // 图片字段
    ]
  },
  "reportData": {
    "rows": {
      "1": {
        "cells": {
          "0": {
            "text": "#{Photo}",
            "edit": {
              "style": "image",
              "attrs": {
                "from": "base64"
              }
            },
            "merge": [9, 0]  // 合并多行显示大图
          }
        }
      }
    }
  }
}
```

#### B. URL图片

数据源返回图片URL地址：

```json
{
  "table": {
    "retrieve": "SELECT ProductID, ImageUrl FROM Products",
    "columns": [
      { "name": "ProductID", "type": "long" },
      { "name": "ImageUrl", "type": "string" }
    ]
  },
  "reportData": {
    "rows": {
      "1": {
        "cells": {
          "0": {
            "text": "#{ImageUrl}",
            "edit": {
              "style": "image",
              "attrs": {
                "from": "url"
              }
            }
          }
        }
      }
    }
  }
}
```

**完整示例：** [`report/textpic`](report/textpic)

该示例展示了员工档案报表，其中照片单元格配置：
```json
{
  "cells": {
    "6": {
      "text": "#{Photo}",
      "edit": {
        "style": "image",
        "attrs": {
          "from": "base64"
        }
      },
      "merge": [9, 0]  // 纵向合并10行显示大图片
    }
  }
}
```

**注意事项：**
- Base64数据不应包含 `data:image/xxx;base64,` 前缀，只需纯Base64字符串
- 图片单元格通常需要合并多个单元格以获得合适的显示尺寸
- 大数据量的Base64图片可能影响性能，建议使用URL方式

**适用场景：** 产品展示、头像显示、证件照等需要图片的场景

---

## 5. BarCode / QRCode 条码单元格

**特点：** 自动生成条形码或二维码

### 5.1 基本配置

```json
{
  "cells": {
    "0": {
      "text": "#{ProductCode}",  // 条码内容
      "edit": {
        "style": "BarCode"  // 条形码
        // 或 "QRCode" 表示二维码
      }
    }
  }
}
```

### 5.2 条码类型

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| `BarCode` | 一维条形码 | 商品编码、图书ISBN等 |
| `QRCode` | 二维码 | URL链接、复杂信息编码 |

### 5.3 使用示例

```json
{
  "table": {
    "retrieve": "SELECT ProductID, Barcode FROM Products",
    "columns": [
      { "name": "ProductID", "type": "long" },
      { "name": "Barcode", "type": "string" }
    ]
  },
  "reportData": {
    "rows": {
      "1": {
        "cells": {
          "0": {
            "text": "#{Barcode}",
            "edit": {
              "style": "BarCode"
            }
          },
          "1": {
            "text": "#{ProductID}",
            "edit": {
              "style": "QRCode"
            }
          }
        }
      }
    }
  }
}
```

**完整示例：** [`report/barcode`](report/barcode)

**注意事项：**
- 条码内容应为字符串格式
- 二维码可以编码更多信息（URL、文本等）
- 打印时确保条码尺寸足够大，便于扫描

**适用场景：** 商品标签、票据打印、身份验证等

---

## 6. HTML 单元格

**特点：** 渲染HTML内容，支持普通HTML和Vue组件，实现富文本和交互式控件

### 6.1 基本配置

```json
{
  "cells": {
    "0": {
      "text": "<label>HTML内容</label>",
      "edit": {
        "style": "html",
        "attrs": {
          "vue": "vue2"  // 可选："vue2" 或 "vue3"，不设置则为普通HTML
        }
      }
    }
  }
}
```

### 6.2 两种模式

#### A. 普通HTML模式

支持Mustache模板语法 `{{}}`，可以引用当前行数据：

```json
{
  "cells": {
    "0": {
      "text": "<label>{{'姓名: ' + ContactName + ', 电话: ' + Phone}}</label>",
      "edit": {
        "style": "html"
      }
    }
  }
}
```

**特点：**
- 使用 `{{表达式}}` 语法绑定数据
- 表达式中可以引用当前行的字段名
- 支持任意HTML标签和CSS样式
- 轻量级，无需额外引入库

**示例：**
```json
{
  "cells": {
    "0": {
      "text": "<div style='color: red; font-weight: bold;'>{{CompanyName}}</div>",
      "edit": {
        "style": "html"
      }
    }
  }
}
```

#### B. Vue模式

支持Vue.js语法和组件，需要页面预先引入Vue和相关组件库：

**前提条件：**
在HTML页面中引入：
```html
<!-- Vue 2 -->
<script src="https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.js"></script>

<!-- 或使用 Vue 3 -->
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>

<!-- Element UI (Vue 2) -->
<script src="https://unpkg.com/element-ui/lib/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/element-ui/lib/theme-chalk/index.css">
```

**Vue 2 示例：**
```json
{
  "cells": {
    "0": {
      "text": "<el-switch v-model='value1' active-text='启用' inactive-text='禁用'></el-switch>",
      "edit": {
        "style": "html",
        "attrs": {
          "vue": "vue2"
        }
      }
    }
  }
}
```

**Vue 3 示例：**
```json
{
  "cells": {
    "0": {
      "text": "<el-button type='primary'>按钮</el-button>",
      "edit": {
        "style": "html",
        "attrs": {
          "vue": "vue3"
        }
      }
    }
  }
}
```

**特点：**
- 支持完整的Vue语法（v-model, v-if, v-for等）
- 可以使用第三方Vue组件（Element UI, Ant Design Vue等）
- `v-model` 可以双向绑定数据到数据源
- 功能强大，但需要引入额外的库

**数据绑定示例：**
```json
{
  "cells": {
    "0": {
      "text": "<el-input v-model='ContactName' placeholder='请输入联系人'></el-input>",
      "edit": {
        "style": "html",
        "attrs": {
          "vue": "vue2"
        }
      }
    }
  }
}
```

当输入框内容改变时，会自动更新数据源中的 `ContactName` 字段。

### 6.3 事件响应

#### Vue模式事件

使用Vue的事件语法 `@event`，会触发 `CellHtmlEvent` 事件：

```json
{
  "cells": {
    "0": {
      "text": "<el-button @click='handleClick' size='mini'>点击</el-button>",
      "edit": {
        "style": "html",
        "attrs": {
          "vue": "vue2"
        }
      }
    }
  }
}
```

JavaScript监听：
```javascript
dw.on('CellHtmlEvent', (evt, row, name, key, ...args) => {
  console.log('事件触发', {
    row: row,        // 当前行号（从1开始）
    name: name,      // 单元格名称
    key: key,        // 事件名称（如 'handleClick'）
    args: args       // 传递的参数
  });
  
  if (key === 'handleClick') {
    // 处理点击事件
    alert('第' + row + '行的按钮被点击');
  }
});
```

**传递参数：**
```json
{
  "text": "<el-button @click='deleteRow(123)'>删除</el-button>"
}
```

```javascript
dw.on('CellHtmlEvent', (evt, row, name, key, ...args) => {
  if (key === 'deleteRow') {
    const id = args[0];  // 获取参数 123
    console.log('删除ID:', id);
  }
});
```

#### 普通HTML模式事件

通过 [CellRender](file://e:\pcwe\h5dwskill\ds.d.ts#L32-L32) 事件手动绑定DOM事件：

```javascript
dw.on('CellRender', (evt, row, name, el) => {
  // el 是单元格的HTML元素
  
  // 查找按钮并绑定点击事件
  const addButton = el.querySelector('.btn-add');
  if (addButton) {
    addButton.onclick = () => {
      dw.insertRow(row);  // 在当前行后插入新行
    };
  }
  
  // 查找删除按钮
  const deleteButton = el.querySelector('.btn-delete');
  if (deleteButton) {
    deleteButton.onclick = () => {
      dw.deleteRow(row);  // 删除当前行
    };
  }
});
```

对应的HTML配置：
```json
{
  "cells": {
    "0": {
      "text": "<button class='btn-add'>添加</button> <button class='btn-delete'>删除</button>",
      "edit": {
        "style": "html"
      }
    }
  }
}
```

**完整示例参考：** [`doc/rpthtmlcell.md`](doc/rpthtmlcell.md)

该文档展示了如何在报表中使用Element UI组件，包括开关、按钮等交互控件。

**注意事项：**
- Vue模式需要确保页面已引入对应版本的Vue.js
- 使用第三方组件库时，需同时引入JS和CSS文件
- HTML内容中的引号需要使用转义或交替使用单双引号
- 大量HTML单元格可能影响性能，建议合理使用

**适用场景：**
- 富文本展示（格式化文字、颜色、样式）
- 交互式控件（按钮、开关、下拉框）
- 自定义UI组件
- 动态内容渲染

---

## 7. Paint 自绘单元格

**特点：** 通过Canvas API自定义绘制内容，实现完全自由的图形绘制

### 7.1 基本配置

```json
{
  "cells": {
    "0": {
      "text": "",  // 通常为空，由绘制代码决定内容
      "edit": {
        "style": "paint",
        "attrs": {}
      },
      "merge": [3, 3]  // 通常需要合并多个单元格提供绘制区域
    }
  }
}
```

### 7.2 绘制方法

在 [CellRender](file://e:\pcwe\h5dwskill\ds.d.ts#L32-L32) 事件中进行绘制：

```javascript
dw.on('CellRender', (evt, row, name, draw) => {
  // draw 对象包含绘制所需的工具
  const { npx, dpr, ctx, DrawBox } = draw;
  
  // evt.view 包含单元格的位置和尺寸
  const { left, top, width, height } = evt.view;
  
  // 保存上下文状态
  ctx.save();
  
  // 适配设备像素比（重要！）
  ctx.scale(dpr(), dpr());
  
  // --- 在此处进行绘制 ---
  
  // 示例：绘制矩形
  ctx.beginPath();
  ctx.rect(left + 10, top + 10, 100, 50);
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0000ff';
  ctx.fill();
  
  // 示例：绘制文本
  ctx.font = '14px Arial';
  ctx.fillStyle = '#000000';
  ctx.fillText('Hello World', left + 20, top + 30);
  
  // 示例：绘制线条
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + width, top + height);
  ctx.strokeStyle = '#00ff00';
  ctx.stroke();
  
  // 恢复上下文状态（必须！）
  ctx.restore();
});
```

### 7.3 draw 对象属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `ctx` | CanvasRenderingContext2D | Canvas 2D上下文，可调用所有Canvas绘制方法 |
| `dpr` | function | 获取设备像素比的函数 |
| `npx` | function | 像素缩放函数，用于适配不同分辨率 |
| `DrawBox` | class | 绘制辅助类（如果可用） |

### 7.4 evt.view 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `left` | number | 单元格左边距（像素） |
| `top` | number | 单元格上边距（像素） |
| `width` | number | 单元格宽度（像素） |
| `height` | number | 单元格高度（像素） |

### 7.5 常用Canvas绘制方法

```javascript
// 1. 绘制矩形
ctx.fillRect(x, y, width, height);      // 填充矩形
ctx.strokeRect(x, y, width, height);    // 描边矩形

// 2. 绘制圆形
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fill();  // 或 ctx.stroke()

// 3. 绘制线条
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();

// 4. 绘制文本
ctx.fillText(text, x, y);
ctx.strokeText(text, x, y);

// 5. 绘制图片
ctx.drawImage(img, x, y, width, height);

// 6. 设置样式
ctx.fillStyle = '#ff0000';      // 填充颜色
ctx.strokeStyle = '#00ff00';    // 描边颜色
ctx.lineWidth = 2;              // 线宽
ctx.font = 'bold 16px Arial';   // 字体
```

### 7.6 完整示例

**示例文件：** [`report/tiwei`](report/tiwei)

体温单示例配置：
```json
{
  "rows": {
    "1": {
      "cells": {
        "0": {
          "name": "id",
          "style": 1,
          "edit": {
            "style": "paint",
            "attrs": {}
          },
          "merge": [3, 3]  // 合并4x21的大区域用于绘制
        }
      }
    }
  }
}
```

JavaScript绘制代码（简化版）：
```javascript
dw.on('CellRender', (evt, row, name, draw) => {
  const { ctx, dpr } = draw;
  const { left, top, width, height } = evt.view;
  
  ctx.save();
  ctx.scale(dpr(), dpr());
  
  // 绘制网格线
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  
  for (let i = 0; i <= 10; i++) {
    const y = top + (height / 10) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }
  
  // 绘制体温曲线
  const data = dw.data[row - 1];  // 获取当前行数据
  if (data && data.temperature) {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // 根据温度数据绘制曲线点
    const tempY = top + height - (data.temperature - 35) / (42 - 35) * height;
    ctx.arc(left + width / 2, tempY, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
});
```

**注意事项：**
- **必须调用 `ctx.save()` 和 `ctx.restore()`** 保护上下文状态
- **必须调用 `ctx.scale(dpr(), dpr())`** 适配高分辨率屏幕
- 坐标和尺寸都需要考虑 `dpr()` 缩放
- 自绘区域通常需要合并多个单元格以获得足够的绘制空间
- 绘制代码应尽量高效，避免复杂的计算影响性能
- 可以访问 `dw.data` 获取数据源进行动态绘制

**适用场景：**
- 体温单、心电图等医疗图表
- 自定义统计图表（折线图、柱状图、饼图等）
- 签名板、画板功能
- 特殊图形和符号
- 任何需要自由绘制的场景

---

## 8. 单元格类型选择指南

### 8.1 快速选择

根据需求选择合适的单元格类型：

1. **简单文本/数字显示** → 普通文本单元格
2. **层级数据展示** → Tree单元格
3. **需要排序/过滤** → ColumnHeader单元格（表头）
4. **显示图片** → Image单元格
5. **生成条码/二维码** → BarCode/QRCode单元格
6. **富文本或交互控件** → HTML单元格
7. **自定义图形/图表** → Paint单元格

### 8.2 组合使用示例

一个复杂的报表可能同时使用多种单元格类型：

```json
{
  "rows": {
    "0": {
      "cells": {
        "0": {
          "text": "产品名称",
          "edit": {
            "style": "columnheader",
            "attrs": { "column": "ProductName", "sortable": true }
          }
        }
      }
    },
    "1": {
      "cells": {
        "0": {
          "text": "#{ProductName}",
          "edit": { "style": "tree" }  // 树形展示产品类别
        },
        "1": {
          "text": "#{ProductImage}",
          "edit": {
            "style": "image",
            "attrs": { "from": "url" }
          }
        },
        "2": {
          "text": "#{Barcode}",
          "edit": { "style": "BarCode" }
        },
        "3": {
          "text": "<el-button @click='viewDetail'>详情</el-button>",
          "edit": {
            "style": "html",
            "attrs": { "vue": "vue2" }
          }
        }
      }
    }
  }
}
```

---

## 相关文档

- [H5DW报表制作主指南](REPORT_AI_SKILL.md)
- [HTML单元格详细教程](doc/rpthtmlcell.md)
- [图片报表教程](doc/rptimage.md)
- [树型列表教程](doc/rpttreeview.md)
- [自绘报表教程](doc/rptpaint.md)
- [条码报表教程](doc/rptbarcode.md)

---

**文档版本：** 1.0  
**更新日期：** 2026-05-13  
**适用版本：** H5DW 最新版

