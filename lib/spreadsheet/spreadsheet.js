import { isEventNumeric, isSpecialEvent } from "./eventhandlers.js";

class SpreadsheetGlobalState {
    #I_MaxPages; #I_Rows; #I_Columns; 
    #S_CurrentPage;
    #B_AppendStyles; #B_Verbose;
    #O_State; #I_CurrentCellMeta;
    #D_Node; #D_Container;#D_Focused_Cell;
    constructor({ Node, MaxPages, Rows, Columns, Data, _append_styles, _fetch_data, _verbose }) {
        this.#D_Node = Node;
        this.#I_MaxPages = MaxPages;
        this.#I_Rows = Rows;
        this.#I_Columns = Columns;
        this.#B_AppendStyles = _append_styles;
        this.#D_Focused_Cell = null;
        this.#S_CurrentPage = null;
        this.#I_CurrentCellMeta = null;
        this.#B_Verbose = _verbose ?? false;
        this.#_append_Styles();
        this.#_attempt_data_fetching(_fetch_data, Data);
    }

    // Data fetching
    _load_data(Data) {
        this.#_attempt_data_fetching(undefined, Data);
    }
    async #_attempt_data_fetching(_fetch_data, Data) {
        Data = await this.#_fetch_data(_fetch_data, Data);

        const { errorFound, message } = this.#_check_if_state_is_corrupted(Data);
        this.#_invoke(errorFound);
        this.#D_Node.append(this.#D_Container);
        if(errorFound) {
            this.#_invoke_error_message(message);
            // throw new Error(`The given 'Data' structure is corrupted or not properly formed`);
            return;
        }
        this.#_load_data();
    }

    async #_fetch_data(_url, Data) {
        if(_url === undefined || _url === '' || _url === false) return Data;

        Data = await fetch(_url)
            .then(r => r.ok ? r.json() : {})
            .then(r => r)
            .catch(e => {
                throw new Error(`Spreadsheet not found '${_url}'`)
            });

        return Data;
    }

    /**
     * Checks if the given *Saved data* has an allowed format
     */
    #_check_if_state_is_corrupted(_Data) {
        if(_Data === undefined || _Data === null) {
            return { errorFound: true, message: ['No spreadsheet was found'] };
        }

        const _data_keys = Object.keys(_Data);
        if(_data_keys.length === 0) return { errorFound: true, message: ['The given spreadsheet cannot be empty'] };
        let errorFound = false;
        let message = [];
        const allowed_cell_properties = ['_column', '_row', '_value', '_type', '_color', '_background'];
        for(let i = 0 ; i < _data_keys.length ; i++) {
            const _meta = _Data[_data_keys[i]];
            if(_meta._name === undefined) {
                message.push(`Every page must contain a '_name' property for further page recognition`);
                errorFound = true;
            }
            if(_meta._meta === undefined) continue;
            if(!Array.isArray(_meta._meta)) {
                errorFound = true;
                message.push(`The '_meta' property in a page, must be an array`);
                continue;
            }
            _meta._meta.forEach((cell_properties, _) => {
                if(cell_properties._column === undefined || cell_properties._row === undefined) {
                    errorFound = true;
                    if(cell_properties._column === undefined) message.push(`The metadata of every cell, must contain a '_column' property to allow for cell localization`);
                    if(cell_properties._row === undefined) message.push(`The metadata of every cell, must contain a '_row' property to allow for cell localization`);
                    return true;
                }
                Object.keys(cell_properties).map(cell_property_key => {
                    if(!allowed_cell_properties.includes(cell_property_key)) {
                        errorFound = true;
                        message.push(`'${cell_property_key}' is not a valid '_meta' property`);
                        return true;
                    }
                });
                if(errorFound) return true;
            });
            if(errorFound) continue;
        }
        if(errorFound) return { errorFound, message};
        this.#O_State = _Data; // Cells with modified properties
        return { errorFound, message };
    }

    #_append_Styles() {
        if(!this.#B_AppendStyles) return;
        const styles = document.createElement('link');
        styles.rel = 'stylesheet';
        styles.href = `./lib/spreadsheet/spreadsheet.css${GetDateAsQueryParam()}`;
        styles.id = 'spread__sheets__styles';
        document.querySelector('head').append(styles);
    }

    // _invoke sections
    #_invoke(errorFound) {
        if(this.#D_Container !== undefined) this.#D_Container.remove();
        this.#D_Container = document.createElement('div');
        this.#D_Container.classList.add('__spreadsheet__container');

        this.#_invoke_header();
        this.#_invoke_body();
        if(errorFound) return;
        this.#_invoke_footer();
    }

    #_invoke_header() {
        // TODO - Add more functionality to the header like changing colors of cells...
        const header = document.createElement('header');

        const header_input = document.createElement('input');
        header_input.type = 'text';
        header_input.disabled = true;
        header_input.addEventListener('keydown', _update_cell_state);

        header.append(header_input);
        this.#D_Container.append(header);
    }

    #_invoke_body() {
        const body = document.createElement('div');
        body.classList.add('__spreadsheet__body');

        const table = document.createElement('table');
        table.classList.add('__spreadsheet__table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const theader_labels = [];

        const thead_row = document.createElement('tr');
        for(let thead_index = 0 ; thead_index <= this.#I_Columns ; thead_index++) {
            const cell = document.createElement('th');
            const text = thead_index === 0 ? '·' : get_thead_label(thead_index);
            cell.append(document.createTextNode(text));
            thead_row.append(cell);
            theader_labels.push(text);
        }
    thead.append(thead_row);

        for(let row_index = 1 ; row_index <= this.#I_Rows ; row_index++) {
            const row = document.createElement('tr');
            for(let col_index = 0 ; col_index <= this.#I_Columns ; col_index++) {
                const cell = document.createElement('td');
                if(col_index === 0) cell.append(document.createTextNode(row_index)); 
                else {
                    cell.setAttribute('row', row_index);
                    cell.setAttribute('column', theader_labels[col_index]);
                }
                cell.addEventListener('click', select_cell);
                row.append(cell);
            }
            tbody.append(row);
        }

        table.append(thead, tbody);
        body.append(table);
        this.#D_Container.append(body);
    }

    #_invoke_footer() {
        const footer = document.createElement('footer');
        const state_keys = Object.keys(this.#O_State);
        if(state_keys.length === 0) {
            const page_name = Uniqid(16);
            const page_label = 'Untitled page';
            const page = create_footer_page(page_name, page_label);
            this.#S_CurrentPage = page_name;
            page.classList.add('active');
            page.addEventListener('click', change_page);
            footer.append(page);
            this.#O_State[page_name] = {_name: page_label,_meta: []};
        } else {
            state_keys.forEach((page_name, i) => {
                const page = create_footer_page(page_name, this.#O_State[page_name]._name);
                if(i === 0) {
                    this.#S_CurrentPage = page_name;
                    page.classList.add('active');
                }
                page.addEventListener('click', change_page);
                footer.append(page);
            });
        }
        
        this.#D_Container.append(footer);
    }

    #_invoke_error_message(_message) {
        const modal = document.createElement('div');
        modal.classList.add('__spreadsheet__error_modal');
        
        const backdrop = document.createElement('div');
        backdrop.classList.add('__spreadsheet__error_backdrop');

        const modal_body = document.createElement('div');
        modal_body.classList.add('__spreadsheet__error_body');

        const title = document.createElement('h1');
        title.textContent = 'The given spreadsheet file is corrupted';

        const code = document.createElement('code');
        code.innerHTML = `${_message.join('.<br />')}.`;

        const load_icon = document.createElement('i');
        load_icon.classList.add('fa-solid', 'fa-upload');
        const load_file = document.createElement('button');
        load_file.addEventListener('click', upload_spreadsheet);
        load_file.append(load_icon, document.createTextNode('Load spreadsheet'));

        modal_body.append(title, load_file, code);
        modal.append(backdrop, modal_body);
        this.#D_Container.append(modal);
    }

    // Data functions
    #_load_data() {
        this.#D_Node.querySelectorAll(`table tbody tr td[modified]`).forEach((_node, i) => {
            _node.textContent = '';
            _node.style = '';
            _node.removeAttribute('modified');
            _node.removeAttribute('cell-type');
        });

        const _meta = this.#O_State[this.#S_CurrentPage]._meta;
        if(_meta === undefined) {
            this.#O_State[this.#S_CurrentPage]._meta = [];
            return;
        }
        if(_meta.length === 0) return;
        
        _meta.map(cell => {
            const _cell_node = this.#D_Node.querySelector(`table tbody tr td[row="${cell._row}"][column="${cell._column}"]`);
            if(_cell_node === null) return true;
            this.#_cell_load_properies({_cell_node, cell});
        });
    }

    #_cell_load_properies({_cell_node, cell}) {
        _cell_node.setAttribute('modified', true);
        // Attibutes
        if(cell._type !== undefined) {
            _cell_node.setAttribute('cell-type', cell._type);
            _cell_node.style.textAlign = cell._type === 'numeric' ? 'right' : 'left';
        }
        // Styles
        if(cell._color !== undefined) _cell_node.style.color = cell._color;
        if(cell._background !== undefined) _cell_node.style.background = cell._background;
        // Values
        if(cell._value !== undefined) _cell_node.textContent = cell._value;
    }

    // Events
    _change_page(_identifier) {
        if(_identifier === this.#S_CurrentPage) return;

        document.querySelector(`div[identifier="${this.#S_CurrentPage}"]`).classList.remove('active');

        this.#S_CurrentPage = _identifier;
        document.querySelector(`div[identifier="${this.#S_CurrentPage}"]`).classList.add('active');
        this.#_load_data();

    }

    _select_cell(_node) {
        if(this.#D_Focused_Cell !== null) {
            this.#I_CurrentCellMeta = null;
            this.#D_Focused_Cell.classList.remove('active');
        }
        _node.classList.add('active');
        this.#D_Focused_Cell = _node;
        const row = parseInt(_node.getAttribute('row'));
        const column = _node.getAttribute('column');
        
        this.#O_State[this.#S_CurrentPage]?._meta.forEach((cell, _index) => {
            if(cell._row === row && cell._column === column) {
                this.#I_CurrentCellMeta = _index;
                return false;
            }
        });
        
        if(this.#I_CurrentCellMeta === null) {
            this.#O_State[this.#S_CurrentPage]._meta.push({
                _column: column,
                _row: row,
                _value: '',
                _type: 'string',
                _background: 'white'
            });
            this.#I_CurrentCellMeta = this.#O_State[this.#S_CurrentPage]._meta.length - 1;
        }
        
        const header_input = document.querySelector('.__spreadsheet__container header input[type="text"]');
        header_input.disabled = false;
        header_input.value = _node.textContent;
        header_input.focus();
    }

    _update_cell_state(event) {
        if(isSpecialEvent(event)) return [ true, this.#D_Focused_Cell ];
        const cell_meta = this.#O_State[this.#S_CurrentPage]._meta[this.#I_CurrentCellMeta];
        let isEventAllowed = true;
        switch(cell_meta._type.toLowerCase()) {
            case 'string':
                isEventAllowed = true;
            break;
            case 'numeric':
                isEventAllowed = isEventNumeric(event);
            break;
            default:
                isEventAllowed = false;
                if(this.#B_Verbose) console.warn(`Cell type '${cell_meta._type}' is not allowed`);
            break;
        }
        return [ isEventAllowed, this.#D_Focused_Cell ];
    }
};

const _update_cell_state = e => {
    const [ isEventAllowed, D_Focused_Cell ] = spreadsheet._update_cell_state(e);
    if(!isEventAllowed) return e.preventDefault();
    
    setTimeout(() => {
        D_Focused_Cell.textContent = e.target.value;
    }, 1);
}

const upload_spreadsheet = e => {
    const _file_node = document.createElement('input');    
    _file_node.type = 'file';
    _file_node.addEventListener('change', async e => {
        const Data = await (e.target.closest('input[type="file"]').files[0]).text();
        spreadsheet._load_data(JSON.parse(Data));
    });

    _file_node.click();
};

const change_page = e => spreadsheet._change_page(e.target.closest('div').getAttribute('identifier'));

const select_cell = e => spreadsheet._select_cell(e.target.closest('td'));

const get_thead_label = index => {
    const A = 65;
    const Z = 90;
    index += A - 1;

    const add_additional_letters = index => {
        if(index <= Z) return String.fromCharCode(index);
        return `A${add_additional_letters((index-Z-1) + A)}`;
    }

    return add_additional_letters(index);
};

const create_footer_page = (_identifier, _name) => {
    const page = document.createElement('div');
    page.setAttribute('identifier', _identifier);
    page.classList.add('__spreadsheet__page');
    page.title = _name;

    const page_name = document.createElement('span');
    page_name.append(document.createTextNode(_name));
    page.append(page_name);

    const remove_icon = document.createElement('i');
    remove_icon.classList.add('fa-solid', 'fa-xmark');
    // TODO - Allow for page removal
    // TODO - Allow for page creation
    // TODO - Allow for page configuration such as change color, change name...
    page.append(remove_icon);
    return page;
};

const GetDateAsQueryParam = () => {
    const date = new Date();
    return `?${date.getFullYear()}${date.getMonth()}${date.getDay()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}${date.getMilliseconds()}`;
};

const LogIfVerbose = (_isVerbose, _message) => {
    if(!_isVerbose) return;
    console.warn(_message);
};


const Uniqid = _length => {
    return Math.random().toString(_length).slice(2);
};

let spreadsheet = null;

export const CreateSpreadsheet = (options = {}) => {
    if(options.Node === undefined) return console.error(`'Node' property must be given to the spreadsheet instance`);    
    if(options._verbose === undefined) options._verbose = false;
    if(options.MaxPages === undefined) {
        options.MaxPages = 8;
        LogIfVerbose(options._verbose, `'MaxPages' property not found, setting default values to ${options.MaxPages}`);
    }
    if(options.Rows === undefined) {
        options.Rows = 100;
        LogIfVerbose(options._verbose, `'Rows' property not found, setting default values to ${options.Rows}`);
    }
    if(options.Columns === undefined) {
        options.Columns = 100;
        LogIfVerbose(options._verbose, `'Columns' property not found, setting default values to ${options.Columns}`);
    }
    if(
        options.Data === undefined && 
        options._fetch_data === undefined
    ) {
        LogIfVerbose(options._verbose, `No explicit 'Data' was given`)
        options.Data = {};
    }
    if(options._append_styles === undefined) {
        options._append_styles = true;
        LogIfVerbose(options._verbose, `'_append_styles' property not found, setting default values to ${options._append_styles}`)
    }

    spreadsheet = new SpreadsheetGlobalState(options);
}