# 自定义函数使用指南

## 概述

自定义函数允许在报表公式（`fparser.js`）中使用业务逻辑。每个 `DataWindow` 实例拥有独立的 `CustomFunctionManager`，实例间互不影响。

**核心流程：**

```
setDataObject(json)
    ↓ ob.functions
CustomFunctionManager.loadFunctions()
    ↓ compiledFunctions
report.setCalc() → evalData._customFunctions (key 小写)
    ↓
fparser 公式求值 → 查找链: valueObj → UserFunctions → _customFunctions → Formula → InFunc → Math → window
    ↓
get dataObject() → getSerializableFunctions() → JSON 可序列化
```

## 快速开始

### 1. 在 dataObject 中定义函数

```javascript
const dataObject = {
    table: {
        columns: [
            { name: 'product', type: 'string' },
            { name: 'price', type: 'number' },
            { name: 'quantity', type: 'number' }
        ],
        data: [
            { product: 'Apple', price: 10, quantity: 5 },
            { product: 'Banana', price: 20, quantity: 3 }
        ]
    },
    // 自定义函数（与 table、events 同级）
    functions: {
        doubleVal: function(value) { return value * 2; },
        addTax: "return Math.round(value * 1.13 * 100) / 100;",
        mid: { params: ['str', 'start', 'length'], code: 'return String(str).substr(start - 1, length);' }
    }
};

const dw = new DataWindow(container);
await dw.setDataObject(dataObject);
```

### 2. 在公式中使用

```javascript
// 通过 evaluate 调用
dw.evaluate('doubleVal(price)', 0);          // 20
dw.evaluate('addTax(price)', 0);             // 11.3
dw.evaluate('mid(product, 2, 3)', 0);        // "ppl"

// 嵌套调用
dw.evaluate('addTax(doubleVal(price))', 0);  // 22.6

// 在列的 compute 表达式中使用
{ name: 'total', compute: 'doubleVal(price) * quantity' }

// 在过滤条件中使用
dw.setFilter('doubleVal(price) > 30');
dw.filter();
```

## 三种定义格式

### Function 格式（推荐）

直接定义 JavaScript 函数，参数按位置一一对应，支持完整的 JavaScript 语法和闭包。

```javascript
functions: {
    // 单参数
    doubleVal: function(value) {
        return value * 2;
    },
    // 多参数
    mid: function(str, start, length) {
        if (str == null) return str;
        return String(str).substr(start - 1, length);
    },
    // 访问当前行数据和行号
    rowLabel: function(value, valueObj, rowNum) {
        return 'Row ' + (rowNum + 1) + ': ' + valueObj.product;
    }
}
```

**参数传递规则：**

```
公式: mid(product, 2, 3)
         ↓ 求值后
innerValues = ["Apple", 2, 3, valueObj, rowNum]
                   ↓        ↓   ↓        ↓        ↓
函数参数:          str    start length  (可选)   (可选)
```

fparser 调用时在公式参数之后追加 `valueObj` 和 `rowNum`，JavaScript 自动忽略多余参数，因此只需声明业务参数即可。需要访问行数据时再显式声明 `valueObj`、`rowNum`。

### String 格式

函数体为字符串，编译为 `new Function('value', 'valueObj', 'rowNum', code)`。仅第一个公式参数映射到 `value`。

```javascript
functions: {
    doubleVal: "return value * 2;",
    addTax: "return Math.round(value * 1.13 * 100) / 100;",
    label: "return 'Item: ' + value + ' (row ' + rowNum + ')';"
}
```

**限制：**
- 只有 `value`（第一个参数）、`valueObj`、`rowNum` 三个形参可用
- 不支持多参数公式（多出的参数无法命名访问）
- 不支持闭包

**适用场景：** 函数逻辑简单，或需要从后端动态下发函数体。

### Object 格式

显式声明参数列表和函数体，编译为 `new Function(...params, 'valueObj', 'rowNum', code)`。

```javascript
functions: {
    mid: {
        params: ['str', 'start', 'length'],
        code: 'return String(str).substr(start - 1, length);'
    },
    concat3: {
        params: ['a', 'b', 'c'],
        code: 'return a + b + c;'
    },
    netAmount: {
        params: ['price', 'qty', 'discount'],
        code: 'return price * qty * (1 - discount);'
    }
}
```

**优势：**
- 多参数有明确命名，可读性好
- 完全可 JSON 序列化（从后端传输/存储/恢复）
- `valueObj` 和 `rowNum` 自动追加，无需在 `params` 中声明

## 函数名大小写

**函数名不区分大小写。** fparser 在解析时将函数名统一转为小写：

```javascript
// 定义时用驼峰
functions: { doubleVal: function(v) { return v * 2; } }

// 公式中以下写法等价：
dw.evaluate('doubleVal(price)', 0)   // ✓
dw.evaluate('DOUBLEVAL(price)', 0)   // ✓
dw.evaluate('Doubleval(price)', 0)   // ✓
```

注入 `evalData._customFunctions` 时，key 统一转为小写存储。

## JSON 序列化

调用 `get dataObject()` 时，自定义函数会被自动序列化为 JSON 安全格式：

```javascript
const dob = dw.dataObject;
const json = JSON.stringify(dob);   // functions 不会丢失

// 从 JSON 恢复
const parsed = JSON.parse(json);
await dw2.setDataObject(parsed);    // 函数自动重新注册
```

**序列化规则：**

| 原始定义格式 | 序列化结果 |
|---|---|
| `function(v) { return v * 2; }` | `{ params: ['v'], code: 'return v * 2;' }` |
| `"return value * 2;"` | `"return value * 2;"` （原样保留） |
| `{ params: [...], code: '...' }` | `{ params: [...], code: '...' }` （原样保留） |

序列化后的数据可通过 `setDataObject()` 重新加载，`CustomFunctionManager` 能正确还原所有函数。

## 函数查找优先级

fparser 按以下顺序查找函数（先命中优先）：

| 优先级 | 来源 | 说明 |
|---|---|---|
| 1 | `valueObj[fname]` | evalData 自身属性（如列名同名方法） |
| 2 | `evalData.UserFunctions` | 全局注册函数 (`registerUserFunction`) |
| 3 | `evalData._customFunctions` | 实例级自定义函数（dataObject.functions） |
| 4 | `Formula.prototype[fname]` | fparser 内置方法（sum, count, if 等） |
| 5 | `InFunc[fname]` | fparser 内部函数 |
| 6 | `Math[fname]` | JavaScript Math 对象方法 |
| 7 | `window[fname]` | 全局函数 |

## 全局函数（UserFunctions）

通过 `registerUserFunction` 注册静态函数，所有 DataWindow 实例共享：

```javascript
import DataStore, { registerUserFunction } from './datawindow/ds.js';

registerUserFunction('getdatetime', function() {
    return new Date();
});

// 所有实例可用
dw1.evaluate('getdatetime()');
dw2.evaluate('getdatetime()');
```

> 实例级自定义函数（dataObject.functions）优先级高于全局函数。

## API 参考

### DataWindow 方法

```javascript
// 获取函数管理器（不存在时自动创建）
const cfm = dw.getCustomFunctionManager();

// 清除所有自定义函数
dw.clearCustomFunctions();
```

### CustomFunctionManager 方法

```javascript
const cfm = dw.getCustomFunctionManager();

// 检查函数是否存在
cfm.hasFunction('doubleVal');    // true / false

// 获取原始定义
cfm.getFunctions();              // { doubleVal: function(...){...}, ... }

// 获取编译后的函数
cfm.getFunction('doubleVal');    // Function 对象

// 获取可序列化表示
cfm.getSerializableFunctions();  // { doubleVal: { params: [...], code: '...' }, ... }

// 注册新函数
cfm.registerFunction('myFn', function(v) { return v + 1; });

// 删除指定函数
cfm.removeFunction('myFn');      // true（成功）/ false（未找到）

// 批量加载
cfm.loadFunctions({ fn1: '...', fn2: function(){} });

// 清空
cfm.clearFunctions();
```

### setDataObject 自动管理

切换 dataObject 时自动清除旧函数、加载新函数：

```javascript
await dw.setDataObject(dataObject1);  // 加载 functions1
await dw.setDataObject(dataObject2);  // 清除 functions1，加载 functions2
```

## 故障排查

| 问题 | 原因 | 解决 |
|------|------|------|
| Function not found | 未定义 / 未 await setDataObject / 拼写错 | `cfm.hasFunction('name')` 检查注册 |
| 多参数只有第一个有值 | 用了 String 格式（仅 `value` 形参） | 改用 Function 或 Object 格式 |
| JSON.stringify 后函数丢失 | 直接序列化了 `_dataObject` | 用 `dw.dataObject` getter（自动转为可序列化格式） |

## 相关文档

- [报表制作指南](REPORT_AI_SKILL.md) — 报表中公式/表达式的使用场景
- [自定义事件管理](./CUSTOM_EVENTS_README.md)
- [公式解析器 fparser.js](../src/datawindow/fparser.js)
- [函数管理器 CustomFunctionManager](../src/datawindow/customFunctions.js)

