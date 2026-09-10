# H5 DataWindow (H5DW) AI Skill Documentation

## Overview
H5DW is a JavaScript implementation of PowerBuilder's DataWindow, providing data presentation and manipulation capabilities similar to PowerBuilder's DataWindow control. It consists of two main classes: DataStore (for data handling) and DataWindow (for UI presentation).

## 安装

```bash
npm install h5dw
```

传统方式（CDN）：
```html
<script src="http://www.satrda.com/h5dw/satreport.js"></script>
<link href="http://www.satrda.com/h5dw/satreport.css" rel="stylesheet">
```

## 快速开始

### ES Module（推荐）

```javascript
import DataWindow from 'h5dw';
import 'h5dw/lib/satreport.css';

const dw = new DataWindow('#datawindow');
dw.dataObject = {
    processing: 1,
    table: {
        columns: [
            { name: 'id', type: 'long', key: true },
            { name: 'name', type: 'string' },
            { name: 'price', type: 'number' }
        ]
    }
};
```

### 传统 HTML

```html
<script src="http://www.satrda.com/h5dw/satreport.js"></script>
<link href="http://www.satrda.com/h5dw/satreport.css" rel="stylesheet">
<div id="datawindow" style="width:500px;height:400px"></div>
<script>
  let dw = new DataWindow('#datawindow');
  dw.dataObject = {
    processing: 1,
    table: {
      columns: [
        {name:'id', type:'long', key:true},
        {name:'name', type:'string'}
      ]
    }
  };
</script>
```

### TypeScript

```typescript
import DataWindow, { DWItemStatus, DWBuffer } from 'h5dw';
import 'h5dw/lib/satreport.css';
const dw: DataWindow = new DataWindow('#datawindow');
const status: DWItemStatus = DWItemStatus.DataModified;
```

### CommonJS

```javascript
const DataWindow = require('h5dw').default;
require('h5dw/lib/satreport.css');
const dw = new DataWindow('#datawindow');
```

## Core Classes

### DataStore Class
The DataStore class handles data operations without UI components, similar to PowerBuilder's DataStore.

#### Key Methods

##### Data Management
- `create(syntax)`: Create DataStore from syntax string or object
- `setDataObject(value)`: Set the data object definition
- `set data(value)` / `get data()`: Get/set raw data array
- `setTransObject(db)`: Set database connection object

##### Row Operations
- `rowCount()`: Return number of rows in primary buffer
- `setItem(row, column, value)`: Set value in specified row/column
- `getItem(row, column)`: Get value from specified row/column
- `insertRow(row)`: Insert a new row
- `deleteRow(row)`: Delete specified row
- `setRow(row)`: Set current row
- `getRow()`: Get current row number

##### Status Management
- `setItemStatus(row, column, buffer, status)`: Change modification status
- `getItemStatus(row, column, buffer)`: Get modification status
- `resetUpdate()`: Clear update flags
- `reset()`: Clear all data

##### Selection
- `selectRow(row, select)`: Select/deselect a row
- `isSelected(row)`: Check if row is selected
- `getSelectedRows()`: Get map of selected rows

##### Filtering and Sorting
- `setFilter(format)`: Set filter criteria
- `filter()`: Apply filter
- `setSort(format)`: Set sort criteria
- `sort()`: Apply sort
- `find(expression, start, end)`: Find row matching expression

##### Database Operations
- `retrieve(...args)`: Retrieve data from database
- `update(accept, resetflag)`: Update database with changes
- `getSQLSelect()`: Get current SQL SELECT statement

##### Event Handling
- `on(eventName, callback)`: Register event handler
- `fire(eventName, ...args)`: Fire an event
- `off(eventName, callback)`: Remove event handler

##### Utility Methods
- `evaluate(expression, n)`: Evaluate expression for specific row
- `describe(propertylist)`: Get property values
- `modify(modstring)`: Modify object properties
- `getChanges(data)`: Get changes as blob
- `setChanges(data)`: Apply changes from blob

##### Buffer Management
- `shareData(dwsecondary)`: Share data with another DataStore
- `shareDataOff()`: Turn off data sharing
- `rowsMove(...)`: Move rows between buffers
- `rowsCopy(...)`: Copy rows between buffers
- `rowsDiscard(...)`: Discard rows from buffer

#### Enumerations
- `DWItemStatus`: NotModified(0), DataModified(1), New(2), NewModified(3)
- `DWUpdateWhere`: KeyColumns(0), KeyAndUpdateColumns(1), KeyAndModifiedColumns(2)
- `DWBuffer`: Primary(0), Delete(1), Filter(2)
- `DWEvent`: Various events like ItemChanged, RowFocusChanged, etc.

### DataWindow Class
The DataWindow class extends DataStore with UI capabilities, implementing the visual DataWindow control.


#### Additional Methods

##### UI Management
- `constructor(el)`: Initialize with HTML element
- `getTargetEl()`: Get target DOM element
- `getSpread()`: Get underlying Spreadsheet instance
- `getEventEl()`: Get event overlay element
- `setRedraw(redraw)`: Enable/disable UI redraws
- `invalidate()`: Force UI refresh

##### Design Mode
- `design(value)`: Enter/exit design mode
- `showDesigner(value)`: Show/hide visual designer
- `isDesign()`: Check if in design mode

##### View Control
- `setOption(key, value)`: Set UI options
- `print(options)`: Print the DataWindow
- `scrollToRow(row)`: Scroll to specified row
- `acceptText()`: Apply editor text to buffer

##### Column/Row Interaction
- `getColumn()`: Get current column number
- `getColumnName()`: Get current column name
- `setColumn(column)`: Set current column
- `setRow(row, selected)`: Set current row with UI selection

##### Editing
- `setText(value)`: Set text in current editor
- `setFocus()`: Set focus to DataWindow
- `selectText(start, length)`: Select text in editor
- `paste()` / `copy()` / `cut()`: Clipboard operations

##### Visual Elements
- `border`, `hScrollBar`, `vScrollBar`: Visual property getters/setters

## Usage Patterns

### 基本操作

```javascript
const rowCount = dw.rowCount();        // 获取行数
const row = dw.insertRow(0);           // 插入行（0=末尾）
dw.deleteRow(row);                     // 删除行
dw.setItem(row, 'name', 'value');      // 设置值
const value = dw.getItem(row, 'name'); // 获取值
```

### 过滤/排序/查找

```javascript
dw.setFilter("name like '小%' and age > 18");
dw.filter();

dw.setSort("name A, age D");  // A=升序, D=降序
dw.sort();

const found = dw.find(expression, startRow);
```

### Events

```javascript
dw.on(DWEvent.ItemChanged, (evt, row, dwo, data) => {
  console.log('Item changed', row, dwo, data);
});
```

### Evaluation

```javascript
dw.evaluate("price * quantity", 1);  // 对第1行求值
```

## Important Notes
- DataWindow extends DataStore, so all DataStore methods are available in DataWindow
- Row numbers are 1-indexed (first row is 1, not 0)
- Column can be specified by name (string) or index (number)
- Buffers: Primary (active data), Delete (deleted rows), Filter (filtered rows)
- In design mode, UI controls are enabled for visual editing
- Events are prefixed with DWEvent enum values
- The modify/describe methods use PowerBuilder-style syntax

## Common Tasks
- Retrieving data: `await dw.retrieve()`
- Updating database: `await dw.update()`
- Adding new row: `dw.insertRow(0)`
- Setting current row: `dw.setRow(1)`
- Getting selected rows: `dw.getSelectedRows()`
- Applying formatting: `dw.modify("column_name.Color = '255'")`
