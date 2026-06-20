// Lightweight stubs for the @jahia/moonstone components used by the UI.
const React = require('react');

const Field = props => React.createElement(
    'div',
    {'data-testid': 'field'},
    React.createElement('label', null, props.label),
    props.children
);

const Button = props => React.createElement(
    'button',
    {
        type: props.type || 'button',
        disabled: Boolean(props.isDisabled),
        onClick: props.onClick
    },
    props.label
);

module.exports = {Field, Button};
