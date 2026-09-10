# Custom Event Manager for H5DW

## Overview

The Custom Event Manager allows you to define and manage user-defined events in DataWindow/DataStore objects. There are two complementary ways to define events:

1. **`eventScript`** (recommended) — a plain JavaScript code string where you can freely define variables, helper functions, and event handlers (via `on_EventName` naming convention). All definitions share the same scope and appear as a single debuggable virtual file in browser DevTools.

2. **`events` object** — an explicit `{ EventName: "code" }` mapping for quick one-liner handlers.

Both can coexist: handlers from `eventScript` are auto-registered first, then `events` object handlers can supplement or override them.

## Features

- `eventScript` 中定义变量、辅助函数、事件处理器共享同一作用域
- `on_EventName` 命名约定自动注册，无需手动调用
- DevTools Sources 面板显示为单一虚拟文件（`h5dw://custom-events/events_N.js`），支持断点调试
- `events` 对象可补充或覆盖 eventScript 中的同名处理器
- 仅接受有效的 DWEvent 事件名

## Supported Events

The following DWEvent events are supported:

- `ItemChanged` - Fired when a cell value changes
- `EditChanged` - Fired when edit value changes
- `ItemFocusChanged` - Fired when item focus changes
- `RowFocusChanged` - Fired when row focus changes
- `ButtonClicked` - Fired when a button is clicked
- `CellRender` - Fired during cell rendering
- `Clicked` - Fired when a cell is clicked
- `DoubleClicked` - Fired when a cell is double-clicked
- `DropDownSelected` - Fired when a dropdown value is selected
- `ToolbarChanged` - Fired when toolbar state changes
- `LayoutViews` - Fired when layout views change
- `CellLayout` - Fired during cell layout
- `RightButtonClicked` - Fired when right button is clicked
- `DataObjectChanged` - Fired when dataObject changes
- `Enter` - Fired when Enter key is pressed
- `KeyDown` - Fired when a key is pressed
- `LoseFocus` - Fired when control loses focus
- `Focus` - Fired when control gains focus
- `RowResized` - Fired when a row is resized
- `ColResized` - Fired when a column is resized
- `CellHtmlEvent` - Fired for cell HTML events

## Basic Usage

### Example 1: Define Events with `eventScript` (Recommended)

Write a plain JS string with variables, helper functions, and event handlers all in one place:

```javascript
import DataWindow from './datawindow/dw';

const dataObject = {
    processing: 1,
    table: {
        columns: [
            { name: 'id', type: 'long', key: true },
            { name: 'name', type: 'string' },
            { name: 'price', type: 'number' },
            { name: 'total', type: 'number' }
        ]
    },
    eventScript: `
        // Variables — shared across all handlers
        let clickCount = 0;

        // Helper functions — accessible by any handler
        function validatePrice(val) {
            return typeof val === 'number' && val >= 0;
        }

        function formatCurrency(val) {
            return '$' + Number(val).toFixed(2);
        }

        // Event handlers — auto-registered via on_EventName convention
        function on_Clicked(evt, row, cell) {
            clickCount++;
            console.log('Click #' + clickCount + ' at row:', row);
        }

        function on_ItemChanged(evt, row, cell, text) {
            if (!validatePrice(Number(text))) {
                alert('Price must be a positive number!');
                return;
            }
            console.log('Item changed at row', row, '- new value:', formatCurrency(text));
        }

        function on_DoubleClicked(evt, row, cell) {
            console.log('Double clicked at row:', row);
        }
    `
};

const dw = new DataWindow('#container');
await dw.setDataObject(dataObject);
// All on_EventName functions are automatically registered
```

### Example 2: Define Events with `events` Object

For simple handlers, use the `events` property directly:

```javascript
const dataObject = {
    table: { /* ... */ },
    events: {
        'ItemChanged': `
            console.log('Item changed:', row, name, data);
            if (name === 'price' && data < 0) {
                alert('Price cannot be negative!');
            }
        `,
        'Clicked': `
            console.log('Cell clicked at row:', row);
        `
    }
};
```

### Example 3: Combine Both Approaches

`eventScript` defines shared logic; `events` object adds or overrides specific handlers:

```javascript
const dataObject = {
    table: { /* ... */ },
    eventScript: `
        function isValidRow(row) { return row > 0; }
        function on_Clicked(evt, row, cell) {
            console.log('Script handler: row=' + row);
        }
    `,
    events: {
        // This overrides the script's on_Clicked
        'Clicked': "console.log('Override: clicked at row=' + row);",
        // This is additional
        'KeyDown': "console.log('Key pressed:', key);"
    }
};
```

### Event Parameters

Event handlers receive parameters based on the event type. Common parameters:

| Event | Parameters |
|-------|------------|
| `Clicked` | `evt, row, cell` |
| `DoubleClicked` | `evt, row, cell` |
| `ItemChanged` | `evt, row, cell, text` |
| `ItemFocusChanged` | `evt, row, cell` |
| `RowFocusChanged` | `evt, row` |
| `KeyDown` | `evt, key, flag` |
| `RightButtonClicked` | `evt, row, cell` |
| `EditChanged` | `evt, row, cell, text` |
| `ButtonClicked` | `evt, name, row` |
| `Enter` | `evt, row, cell` |

```javascript
eventScript: `
    function on_ItemChanged(evt, row, cell, text) {
        // evt  - the event object
        // row  - row number (1-based)
        // cell - cell/column info
        // text - the new text value
        console.log('Row:', row, 'New value:', text);
    }
`
```

### Example 4: Programmatic Management

```javascript
const manager = dw.getCustomEventManager();

manager.hasEvent('ItemChanged');         // 检查是否已注册
manager.getEvents();                     // 获取所有已加载事件
manager.registerEvent('Clicked', `console.log('Clicked!');`);  // 动态注册
manager.setEventScript(`...`);           // 替换脚本
manager.loadEvents(null);                // 重新加载应用
manager.clearEvents();                   // 清除所有处理器
dw.clearCustomEvents();                  // 等价快捷方式
```

## Advanced Usage

### 共享辅助函数 + 状态保持

eventScript 中所有代码共享作用域，可维护跨事件状态：

```javascript
eventScript: `
    let editHistory = [];

    function getRowData(row) { return dw.getItem(row) || {}; }

    function calculateTotal(row) {
        const data = getRowData(row);
        dw.setItem(row, 'total', (data.quantity || 0) * (data.price || 0));
    }

    function on_ItemChanged(evt, row, cell, text) {
        const colName = cell && cell.name;
        if (colName === 'quantity' || colName === 'price') calculateTotal(row);
    }

    function on_EditChanged(evt, row, cell, text) {
        editHistory.push({ row, cell: cell && cell.name, text, time: Date.now() });
        if (editHistory.length > 50) editHistory.shift();
    }
`
```

## API Reference

### CustomEventManager

| 方法 | 说明 |
|------|------|
| `setEventScript(script)` | 设置事件脚本（JS 代码字符串） |
| `getEventScript()` | 获取当前脚本 |
| `clearEventScript()` | 清除脚本 |
| `loadEvents(events?)` | 加载并注册事件（构建虚拟源文件） |
| `registerEvent(name, code)` | 注册单个事件处理器（code 为字符串或函数） |
| `clearEvents()` | 移除所有已注册处理器 |
| `getEvents()` | 获取已加载事件对象 |
| `hasEvent(name)` | 检查事件是否已注册 |
| `destroy()` | 销毁管理器并清理 |

### DataStore/DataWindow 方法

- `getCustomEventManager()` — 获取 CustomEventManager 实例
- `clearCustomEvents()` — 清除所有自定义事件

## Implementation Details

**执行流程：**
`setDataObject` → 检测 `eventScript`/`events` → 创建 CustomEventManager → `loadEvents()` 构建虚拟源文件（嵌入 eventScript + 自动注册检查 + events 对象处理器 + sourceURL）→ `new Function()` 编译执行 → 通过 `eventMap.on()` 注册

**自动注册规则：**
- `on_Clicked` → 注册为 `Clicked` 事件处理器
- `EventName` 部分必须精确匹配 DWEvent 常量（大小写敏感）
- 不匹配的名称静默忽略

**处理器执行上下文：**
- eventScript 作用域（所有变量/函数）
- 事件参数（`evt`, `row`, `cell`, `text` 等）
- DataWindow 实例（通过 `__dw` 参数）
- 全局 `window`

## Troubleshooting

| 问题 | 检查项 |
|------|--------|
| 事件不触发 | `on_EventName` 大小写精确匹配 DWEvent；`setDataObject` 已 await 完成 |
| 代码不工作 | DevTools Sources 查找 `h5dw://custom-events/events_N.js`；控制台检查语法错误 |
| 变量不保持 | `loadEvents()` 会重建作用域重置变量；`clearEvents()` 不清除脚本 |
| 内存泄漏 | 不再需要时调用 `clearCustomEvents()` 或 `destroy()` |

## 相关文档

- [报表制作指南](REPORT_AI_SKILL.md)
- [自定义函数](CUSTOM_FUNCTIONS_README.md)
- 测试文件：`test_customEvents.html`、`test/customEvents.test.js`

