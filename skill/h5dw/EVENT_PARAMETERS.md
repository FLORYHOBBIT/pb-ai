# Event Parameter Reference

This document describes the parameters passed to each DWEvent handler.

## Event Handler Parameters

Each event type has a specific parameter signature. When writing custom event handlers, use these parameter names:

### Data Change Events

#### ItemChanged
Triggered when a cell value changes.
```javascript
"ItemChanged": "console.log('Row:', row, 'Cell:', cell, 'Text:', text)"
```
**Parameters:**
- `evt` - Event object containing {dw, row, colName, text, cell, ri, ci}
- `row` - Row number (1-based)
- `cell` - Cell object
- `text` - New text value

#### EditChanged
Triggered when edit value changes.
```javascript
"EditChanged": "console.log('Edit changed:', text)"
```
**Parameters:** Same as ItemChanged

### Focus Events

#### ItemFocusChanged
Triggered when item focus changes.
```javascript
"ItemFocusChanged": "console.log('Focus moved to row:', row, 'cell:', cell)"
```
**Parameters:**
- `evt` - Event object containing {dw, ri, ci, row, cell, colName}
- `row` - Row number (1-based)
- `cell` - Cell object

#### RowFocusChanged
Triggered when row focus changes.
```javascript
"RowFocusChanged": "console.log('Row focus changed to:', row)"
```
**Parameters:**
- `evt` - Event object containing {dw}
- `row` - Row number (1-based)

#### Focus / LoseFocus
Triggered when datawindow gains/loses focus.
```javascript
"Focus": "console.log('DataWindow focused')"
"LoseFocus": "console.log('DataWindow lost focus')"
```
**Parameters:**
- `evt` - Event object containing {dw}

### Click Events

#### Clicked
Triggered when a cell is clicked.
```javascript
"Clicked": "console.log('Clicked at row:', row, 'cell:', cell)"
```
**Parameters:**
- `evt` - Event object containing {dw, row, colName, cell, ri, ci}
- `row` - Row number (1-based, 0 for header)
- `cell` - Cell object

#### DoubleClicked
Triggered when a cell is double-clicked.
```javascript
"DoubleClicked": "console.log('Double clicked at row:', row)"
```
**Parameters:** Same as Clicked

#### RightButtonClicked
Triggered when right mouse button is clicked.
```javascript
"RightButtonClicked": "console.log('Right click at row:', row)"
```
**Parameters:** Same as Clicked

#### ButtonClicked
Triggered when a button cell is clicked.
```javascript
"ButtonClicked": "console.log('Button', name, 'clicked at row:', row)"
```
**Parameters:**
- `evt` - Event object containing {cell, dw, row, name}
- `row` - Row number (1-based)
- `colIndex` - Column index (always 0 for buttons)
- `name` - Button name from edit.attrs.name

### Keyboard Events

#### KeyDown
Triggered when a key is pressed.
```javascript
"KeyDown": "console.log('Key:', key, 'Flag:', flag)"
```
**Parameters:**
- `evt` - Event object containing {dw, key, ctrlKey, shiftKey, metaKey}
- `key` - Converted key string (e.g., 'keyenter!', 'keyuparrow!')
- `flag` - Modifier flags (1=Shift, 2=Ctrl)

#### Enter
Triggered when Enter key is pressed.
```javascript
"Enter": "console.log('Enter pressed')"
```
**Parameters:**
- `evt` - Event object containing {dw}

### Layout & Render Events

#### CellRender
Triggered during cell rendering.
```javascript
"CellRender": "console.log('Rendering cell:', row, name)"
```
**Parameters:**
- `evt` - Event object containing {view, cell, dw, draw, type}
- `row` - Row number (1-based)
- `name` - Cell name
- `draw` - Draw context

#### CellLayout
Triggered during cell layout.
```javascript
"CellLayout": "console.log('Cell layout')"
```
**Parameters:**
- `evt` - Event object containing {dw}

#### LayoutViews
Triggered when layout views change.
```javascript
"LayoutViews": "console.log('Layout changed')"
```
**Parameters:**
- `evt` - Event object containing {dw}

### Resize Events

#### RowResized
Triggered when a row is resized.
```javascript
"RowResized": "console.log('Row', evt.row, 'resized to', evt.rowHeight)"
```
**Parameters:**
- `evt` - Event object containing {dw, row, rowHeight}

#### ColResized
Triggered when a column is resized.
```javascript
"ColResized": "console.log('Column', evt.col, 'resized to', evt.colWidth)"
```
**Parameters:**
- `evt` - Event object containing {dw, col, colWidth}

### UI Interaction Events

#### ToolbarChanged
Triggered when toolbar state changes.
```javascript
"ToolbarChanged": "console.log('Toolbar:', type, '=', value)"
```
**Parameters:**
- `evt` - Event object containing {type, value, dw}
- `type` - Toolbar action type
- `value` - Toolbar action value

#### DropDownSelected
Triggered when a dropdown value is selected.
```javascript
"DropDownSelected": "console.log('Dropdown selection changed')"
```
**Parameters:**
- `evt` - Event object

#### CellHtmlEvent
Triggered for HTML cell events.
```javascript
"CellHtmlEvent": "console.log('HTML event:', key, 'on cell:', name)"
```
**Parameters:**
- `evt` - Event object containing {view, cell, dw, key, type}
- `row` - Row number (1-based)
- `name` - Cell name
- `key` - Event key
- `...args` - Additional arguments

### Data Events

#### DataObjectChanged
Triggered when dataObject changes.
```javascript
"DataObjectChanged": "console.log('DataObject changed')"
```
**Parameters:**
- `evt` - Event object containing {dw}

## Usage Examples

### Example 1: Validate input on ItemChanged
```javascript
events: {
    "ItemChanged": `
        if (name === 'email' && !text.includes('@')) {
            alert('Invalid email format');
            dw.setItem(row, name, '');
        }
    `
}
```

### Example 2: Auto-calculate on EditChanged
```javascript
events: {
    "EditChanged": `
        if (colName === 'quantity' || colName === 'price') {
            const qty = dw.getItem(row, 'quantity') || 0;
            const price = dw.getItem(row, 'price') || 0;
            dw.setItem(row, 'total', qty * price);
        }
    `
}
```

### Example 3: Handle button clicks
```javascript
events: {
    "ButtonClicked": `
        if (name === 'btnDelete') {
            if (confirm('Delete row ' + row + '?')) {
                dw.deleteRow(row);
            }
        } else if (name === 'btnEdit') {
            console.log('Edit row:', row);
        }
    `
}
```

### Example 4: Track row focus
```javascript
events: {
    "RowFocusChanged": `
        console.log('User moved to row:', row);
        // Load related data for the selected row
        loadRelatedData(dw.getItem(row, 'id'));
    `
}
```

### Example 5: Keyboard shortcuts
```javascript
events: {
    "KeyDown": `
        if (key === 'keyenter!' && flag === 2) { // Ctrl+Enter
            dw.update();
        }
    `
}
```

## Important Notes

1. **Parameter Access**: You can access parameters directly by name (e.g., `row`, `cell`) or through the `evt` object (e.g., `evt.row`, `evt.cell`).

2. **Event Object**: The `evt` object always contains a `dw` property referencing the DataWindow instance.

3. **Row Numbers**: Row numbers are 1-based (first data row is 1). Header rows use 0.

4. **Cell Objects**: The `cell` parameter contains the cell's properties including `name`, `text`, `edit`, etc.

5. **Error Handling**: Wrap your code in try-catch blocks to prevent errors from breaking the event chain.

6. **Async Operations**: Event handlers can include async operations, but the event system doesn't wait for promises.

## Common Patterns

### Pattern 1: Conditional validation
```javascript
"ItemChanged": `
    if (name === 'age' && (text < 0 || text > 150)) {
        alert('Age must be between 0 and 150');
        dw.setItem(row, name, 0);
    }
`
```

### Pattern 2: Cascading updates
```javascript
"ItemChanged": `
    if (name === 'country') {
        dw.setItem(row, 'region', getRegionForCountry(text));
    }
`
```

### Pattern 3: Logging and auditing
```javascript
"ItemChanged": `
    console.log(\`User changed \${name} from \${cell.oldValue} to \${text} at \${new Date().toISOString()}\`);
`
```

## Testing Your Event Handlers

You can test event handlers using the browser console:

```javascript
// Get the DataWindow instance
const dw = window.myDataWindow;

// Test firing an event
dw.eventMap.fire('ItemChanged', 
    { dw, row: 1, cell: { name: 'price' }, text: '100' },
    1,
    { name: 'price' },
    '100'
);
```

