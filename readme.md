# Web-Spreadsheet

## Assets
The `web-spreadsheet` library needs the `Fontawesome` icon

## Spreadsheet metadata

The metadata of a spreadsheet is the core structure which
specifies various different aspects of the spreadsheet.  
From the names of the pages to the configuration of each individual cell.

## Medatada types
There's three types of metadata:  
* Passed from a variable
    + Possible using the `Data` property
* Fetching data from a url
    + Possible using the `_fetch_data` property
    + `_fetch_data` must be a path to a `json` file or route that returns a `json` file
* Allowing the user to load a spreadsheet
    + Currently available if the previous `Data` or `_fetch_data` are present with invalid `metadata` formations... It will prompt an error modal to the screen with a button to upload a spreadsheet from the user's machine

```js
// Example data
const Data = {
    '98fc1436404f3': {
        _name: 'Test page',
        _meta: [
            {
                _column: 'A',
                _row: 1,
                _value: 4,
                _type: 'numeric',
                _color: '#008000'
            },
            {
                _column: 'AAB',
                _row: 90,
                _value: 'Hello world',
                _type: 'string',
                _background: '#d3d3d3'
            }
        ]
    },
    '182c1436494g3': {
        _name: 'Page 2',
        _meta: []
    }
};
```

```js
const node = document.getElementById('root');
CreateSpreadsheet({
    Node: node,
    MaxPages: 1,
    Rows: 10,
    Columns: 10,
    Data,
    _verbose: true,
    _append_styles: true,
    // _fetch_data: 'route'
});
```

## Must know

Every cell `metadata` must contain both the `_column` and `_row` properties as the spreadsheet loader won't be able to locate set cell for further processing.

The `Web-Spreadsheet` library automatically appends the `/lib/spreadsheet/spreadsheet.css` styles into the `HTML DOM`

## Default values
```json
    "MaxPages": 8
    "Rows": 100
    "Columns": 100
    "_verbose": false
```

## The `_verbose` property
If the `_verbose` property is set to `true`, the spreadsheet loader will enter `debug mode`.

`debug mode` will output `warning` messages to the console when a property, value, formula, key... doesn't work as intended or is empty. Most of this `warnings` can be ignored.