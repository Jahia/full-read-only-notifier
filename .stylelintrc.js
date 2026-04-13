'use strict';

module.exports = {
    extends: ['stylelint-config-standard-scss', 'stylelint-config-css-modules'],
    plugins: ['stylelint-order'],
    ignoreFiles: ['**/*.jsx'],
    rules: {
        // Override: let stylelint-scss handle unknown at-rules instead
        'at-rule-no-unknown': null,
        'scss/at-rule-no-unknown': true,

        'at-rule-empty-line-before': [
            'always',
            {
                except: ['first-nested'],
                ignore: ['blockless-after-same-name-blockless', 'after-comment'],
                ignoreAtRules: ['if', 'else']
            }
        ],
        'declaration-empty-line-before': [
            'always',
            {
                except: ['first-nested'],
                ignore: ['after-comment', 'after-declaration', 'inside-single-line-block']
            }
        ],
        'font-family-name-quotes': 'always-unless-keyword',
        'function-name-case': 'lower',
        'function-url-quotes': 'always',
        'selector-pseudo-element-colon-notation': 'double',
        'shorthand-property-no-redundant-values': true,
        'declaration-block-no-duplicate-properties': true,
        'declaration-block-no-redundant-longhand-properties': true,
        'value-keyword-case': 'lower',
        'comment-empty-line-before': [
            'always',
            {
                except: ['first-nested'],
                ignore: ['after-comment', 'stylelint-commands']
            }
        ],
        'max-nesting-depth': 3,

        // SCSS rules
        'scss/at-extend-no-missing-placeholder': true,
        'scss/at-mixin-argumentless-call-parentheses': 'never',
        'scss/dollar-variable-colon-space-after': 'always',
        'scss/dollar-variable-colon-space-before': 'never',
        'scss/dollar-variable-empty-line-before': [
            'always',
            {
                except: ['first-nested', 'after-comment', 'after-dollar-variable']
            }
        ],
        'scss/double-slash-comment-empty-line-before': [
            'always',
            {
                except: ['first-nested'],
                ignore: ['between-comments', 'stylelint-commands']
            }
        ],
        'scss/no-duplicate-dollar-variables': [
            true,
            {
                ignoreInsideAtRules: ['if', 'else', 'each']
            }
        ],
        'scss/operator-no-unspaced': true,

        // Property ordering (from @jahia/stylelint-config)
        'order/order': [
            {type: 'at-rule', name: 'include'},
            {type: 'at-rule', name: 'extend'},
            'custom-properties',
            'dollar-variables',
            'declarations',
            {type: 'rule', selector: '/^&:[\\w-]+$/'},
            {type: 'rule', selector: '/^&::[\\w-]+$/'},
            {type: 'rule', selector: '/^&/'},
            {type: 'rule', selector: '/^\\./'},
            {type: 'rule'}
        ],
        'order/properties-order': [
            {
                groupName: 'Position',
                emptyLineBefore: 'always',
                properties: ['position', 'top', 'right', 'bottom', 'left', 'z-index']
            },
            {
                groupName: 'BoxModel',
                emptyLineBefore: 'always',
                properties: [
                    'display', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis',
                    'flex-flow', 'flex-direction', 'flex-wrap',
                    'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow',
                    'grid-auto-rows', 'grid-column', 'grid-column-end', 'grid-column-gap',
                    'grid-column-start', 'grid-gap', 'grid-row', 'grid-row-end',
                    'grid-row-gap', 'grid-row-start', 'grid-template',
                    'grid-template-areas', 'grid-template-columns', 'grid-template-rows',
                    'gap', 'justify-content', 'justify-self', 'align-content',
                    'align-items', 'align-self', 'order', 'float', 'clear', 'box-sizing',
                    'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
                    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
                ]
            },
            {
                groupName: 'Typography',
                emptyLineBefore: 'always',
                properties: [
                    'src', 'font', 'font-weight', 'font-size', 'font-family', 'font-style',
                    'font-variant', 'font-size-adjust', 'font-stretch', 'font-effect',
                    'font-emphasize', 'font-emphasize-position', 'font-emphasize-style',
                    'font-smooth', 'color', 'fill', 'fill-rule', 'clip-rule', 'stroke',
                    'line-height', 'direction', 'letter-spacing', 'white-space',
                    'text-align', 'text-align-last', 'text-transform', 'text-decoration',
                    'text-emphasis', 'text-emphasis-color', 'text-emphasis-style',
                    'text-emphasis-position', 'text-indent', 'text-justify', 'text-outline',
                    'text-wrap', 'text-overflow', 'text-overflow-ellipsis',
                    'text-overflow-mode', 'text-orientation', 'text-shadow',
                    'vertical-align', 'word-wrap', 'word-break', 'word-spacing',
                    'overflow-wrap', 'tab-size', 'hyphens', 'unicode-bidi',
                    'columns', 'column-count', 'column-fill', 'column-gap', 'column-rule',
                    'column-rule-color', 'column-rule-style', 'column-rule-width',
                    'column-span', 'column-width',
                    'page-break-after', 'page-break-before', 'page-break-inside'
                ]
            },
            {
                groupName: 'Visual',
                emptyLineBefore: 'always',
                properties: [
                    'appearance', 'border', 'border-width', 'border-style', 'border-color',
                    'border-top', 'border-top-width', 'border-top-style', 'border-top-color',
                    'border-right', 'border-right-width', 'border-right-style', 'border-right-color',
                    'border-bottom', 'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
                    'border-left', 'border-left-width', 'border-left-style', 'border-left-color',
                    'border-radius', 'border-top-left-radius', 'border-top-right-radius',
                    'border-bottom-right-radius', 'border-bottom-left-radius',
                    'border-image', 'border-image-source', 'border-image-slice',
                    'border-image-width', 'border-image-outset', 'border-image-repeat',
                    'border-collapse', 'border-spacing',
                    'outline', 'outline-width', 'outline-style', 'outline-color', 'outline-offset',
                    'list-style', 'list-style-position', 'list-style-type', 'list-style-image',
                    'table-layout', 'empty-cells', 'caption-side',
                    'background', 'background-color', 'background-image', 'background-repeat',
                    'background-position', 'background-position-x', 'background-position-y',
                    'background-size', 'background-clip', 'background-origin',
                    'background-attachment', 'background-blend-mode',
                    'box-decoration-break', 'box-shadow',
                    'transform', 'transform-origin', 'transform-style', 'backface-visibility',
                    'perspective', 'perspective-origin',
                    'visibility', 'cursor', 'opacity', 'filter', 'backdrop-filter'
                ]
            },
            {
                groupName: 'Animation',
                emptyLineBefore: 'always',
                properties: [
                    'transition', 'transition-delay', 'transition-timing-function',
                    'transition-duration', 'transition-property',
                    'animation', 'animation-name', 'animation-duration',
                    'animation-play-state', 'animation-timing-function',
                    'animation-delay', 'animation-iteration-count',
                    'animation-direction', 'animation-fill-mode',
                    'will-change'
                ]
            },
            {
                groupName: 'Misc',
                emptyLineBefore: 'always',
                properties: ['user-select', 'pointer-events', 'touch-action', 'zoom']
            }
        ]
    }
};
