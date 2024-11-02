const _create_regular_button = (_name, _config, _disabled = true) => {
    const button = document.createElement('button');
    const icon = document.createElement('i');
    icon.classList.add(..._config._icon.split(' '));
    button.title = _name;
    button.disabled = _disabled;
    button.setAttribute('_name', _name.toLowerCase());
    button.append(icon);
    if(_config._onclick !== undefined) button.addEventListener('click', _config._onclick);
    return button
};

const _create_dropdown_button = (_name, _config) => {
    const button = _create_regular_button(_name, _config, false);
    if(_config._children.length === 0) return button;
    button.style.position = 'relative';

    const container = document.createElement('div');
    container.style = 'display: none;z-index: 99999;position: absolute;border-radius: 5px;box-shadow: 2px 2px 2px 2px lightgray;background-color: white; width: max-content;min-height: 10px; max-height: fit-content;';

    _config._children.forEach((option, _) => {
        const _option_span = document.createElement('span');
        _option_span.append(document.createTextNode(option._text));
        if(option._onclick !== undefined) _option_span.addEventListener('click', option._onclick);
        
        container.append(_option_span);
    });
    
    button.append(container);
    return button;
};

const _toggle_bold = e => {
    const _node = _spreadsheet_instance._get_current_cell_node();

    if(_node.style.fontWeight === '') {
        _node.style.fontWeight = 'bold';
        _spreadsheet_instance._set_property_current_cell('_bold', true);
    }
    else {
        _node.style.fontWeight = '';
        _spreadsheet_instance._remove_property_current_cell('_bold');
    }
}
const _toggle_italic = e => {
    const _node = _spreadsheet_instance._get_current_cell_node();

    if(_node.style.fontWeight === '') {
        _node.style.fontWeight = 'italic';
        _spreadsheet_instance._set_property_current_cell('_italic', true);
    }
    else {
        _node.style.fontWeight = '';
        _spreadsheet_instance._remove_property_current_cell('_italic');
    }
}

const _export_web_spreadsheet = _ => _spreadsheet_instance._donwload_state();

const _button_list = {
    Bold: {
        _icon: 'fa-solid fa-bold',
        _onclick: _toggle_bold
    },
    Italic: {
        _icon: 'fa-solid fa-italic',
        _onclick: _toggle_italic
    },
    Export: {
        _icon: 'fa-solid fa-download',
        _children: [
            {
                _text: 'Export to Web-Spreadsheet file',
                _onclick: _export_web_spreadsheet
            }
        ]
    }
};

let _spreadsheet_instance = null;

export const CreateButtons = _spreadsheet => {
    _spreadsheet_instance = _spreadsheet;
    const container = document.createElement('div');
    
    Object.keys(_button_list).forEach((button_key, _) => {
        const button = _button_list[button_key];

        if(button._children == undefined) container.append(_create_regular_button(button_key, button));
        else container.append(_create_dropdown_button(button_key, button));
    });

    return container;
};