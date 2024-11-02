const keyCodes = Object.freeze({
    ZERO: 48,
    NINE: 75,
    BACKSPACE: 8,
    ENTER: 13,
    DELETE: 46, // SUPR
});

export const isEventNumeric = ({ keyCode }) => keyCode >= keyCodes.ZERO && keyCode <= keyCodes.NINE;
export const isSpecialEvent = ({ keyCode }) => [keyCodes.BACKSPACE, keyCodes.ENTER, keyCodes.DELETE].includes(keyCode);