/**
 * Palenight Theme for Monaco Editor
 *
 * Dark theme for walkerOS Explorer matching Prism's palenight theme.
 * Aligned with website documentation syntax highlighting for consistency.
 *
 * Token Color Mappings (Matching Prism Palenight):
 * - comment: #697098 - gray, italic
 * - string/inserted: #c3e88d - green
 * - number: #f78c6c - orange
 * - builtin/char/constant/function: #82aaff - blue
 * - punctuation/delimiter: #c792ea - purple
 * - variable: #bfc7d5 - light gray
 * - class-name: #ffcb6b - yellow/gold
 * - attr-name: #c3e88d - green (matching string color)
 * - tag/deleted: #ff5572 - red/pink
 * - operator: #89ddff - cyan
 * - boolean: #ff5874 - red
 * - keyword: #c084fc - bright purple, italic
 * - doctype: #c084fc - purple, italic
 * - namespace: #b2ccd6 - blue-gray
 * - url: #dddddd - white
 */

import type { editor } from 'monaco-editor';

export const palenightTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '697098', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '697098', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '697098', fontStyle: 'italic' },

    // Strings - green matching Prism palenight
    { token: 'string', foreground: 'c3e88d' },
    { token: 'string.quoted', foreground: 'c3e88d' },
    { token: 'string.template', foreground: 'c3e88d' },
    { token: 'string.regexp', foreground: '89ddff' },

    // Language-specific strings (Monaco uses these exact token names)
    { token: 'string.value.json', foreground: 'c3e88d' },
    { token: 'string.json', foreground: 'c3e88d' },
    { token: 'string.html', foreground: 'c3e88d' },
    { token: 'string.css', foreground: 'c3e88d' },
    { token: 'string.js', foreground: 'c3e88d' },
    { token: 'string.ts', foreground: 'c3e88d' },

    // Numbers
    { token: 'number', foreground: 'f78c6c' },
    { token: 'number.hex', foreground: 'f78c6c' },
    { token: 'number.binary', foreground: 'f78c6c' },
    { token: 'number.octal', foreground: 'f78c6c' },
    { token: 'number.float', foreground: 'f78c6c' },

    // Keywords - brighter purple/magenta
    { token: 'keyword', foreground: 'c084fc', fontStyle: 'italic' },
    { token: 'keyword.control', foreground: 'c084fc', fontStyle: 'italic' },
    { token: 'keyword.operator', foreground: '89ddff' },
    { token: 'keyword.other', foreground: 'c084fc' },

    // Operators - cyan matching Prism palenight
    { token: 'operator', foreground: '89ddff' },
    { token: 'operators', foreground: '89ddff' },

    // Functions
    { token: 'function', foreground: '82aaff' },
    { token: 'identifier.function', foreground: '82aaff' },
    { token: 'support.function', foreground: '82aaff' },
    { token: 'entity.name.function', foreground: '82aaff' },

    // Types & Classes
    { token: 'type', foreground: 'ffcb6b' },
    { token: 'type.identifier', foreground: 'ffcb6b' },
    { token: 'entity.name.type', foreground: 'ffcb6b' },
    { token: 'entity.name.class', foreground: 'ffcb6b' },
    { token: 'support.type', foreground: 'ffcb6b' },
    { token: 'support.class', foreground: 'ffcb6b' },

    // Variables
    { token: 'variable', foreground: 'bfc7d5' },
    { token: 'variable.name', foreground: 'bfc7d5' },
    { token: 'variable.parameter', foreground: 'bfc7d5' },

    // Constants & Built-ins
    { token: 'constant', foreground: '82aaff' },
    { token: 'constant.language', foreground: 'ff5874' },
    { token: 'constant.numeric', foreground: 'f78c6c' },
    { token: 'constant.character', foreground: '82aaff' },
    { token: 'support.constant', foreground: '82aaff' },

    // Booleans
    { token: 'constant.language.boolean', foreground: 'ff5874' },
    { token: 'keyword.constant.boolean', foreground: 'ff5874' },

    // Delimiters & Punctuation - purple matching Prism palenight
    { token: 'delimiter', foreground: 'c792ea' },
    { token: 'delimiter.bracket', foreground: 'c792ea' },
    { token: 'delimiter.parenthesis', foreground: 'c792ea' },
    { token: 'delimiter.square', foreground: 'c792ea' },
    { token: 'punctuation', foreground: 'c792ea' },

    // Tags (HTML/XML/JSX)
    { token: 'tag', foreground: 'ff5572' },
    { token: 'meta.tag', foreground: 'ff5572' },
    { token: 'entity.name.tag', foreground: 'ff5572' },

    // Tag Attributes (using string color for consistency with how Prism treats attributes)
    { token: 'attribute.name', foreground: 'c3e88d' },
    { token: 'entity.other.attribute-name', foreground: 'c3e88d' },

    // Namespaces
    { token: 'namespace', foreground: 'b2ccd6' },
    { token: 'entity.name.namespace', foreground: 'b2ccd6' },

    // URLs
    { token: 'markup.underline.link', foreground: 'dddddd' },

    // Doctype
    {
      token: 'meta.tag.sgml.doctype',
      foreground: 'c084fc',
      fontStyle: 'italic',
    },

    // Object Keys - Unified light gray for all property names
    // Covers JSON, TypeScript, JavaScript object literals
    { token: 'support.type.property-name', foreground: 'bfc7d5' },
    { token: 'support.type.property-name.json', foreground: 'bfc7d5' },
    { token: 'string.key.json', foreground: 'bfc7d5' },
    { token: 'meta.object-literal.key', foreground: 'bfc7d5' },
    { token: 'variable.other.property', foreground: 'bfc7d5' },
    { token: 'identifier', foreground: 'bfc7d5' },
    { token: 'identifier.ts', foreground: 'bfc7d5' },
    { token: 'identifier.js', foreground: 'bfc7d5' },

    // Markdown
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.heading', foreground: 'c084fc', fontStyle: 'bold' },

    // Language-Specific: JavaScript/TypeScript
    { token: 'variable.parameter.ts', foreground: 'bfc7d5' },
    { token: 'variable.parameter.js', foreground: 'bfc7d5' },
    { token: 'support.type.primitive.ts', foreground: 'ffcb6b' },
    { token: 'support.type.primitive.js', foreground: 'ffcb6b' },
    { token: 'entity.name.type.ts', foreground: 'ffcb6b' },
    { token: 'entity.name.type.js', foreground: 'ffcb6b' },
    { token: 'meta.type.annotation.ts', foreground: 'ffcb6b' },
    { token: 'keyword.operator.type.ts', foreground: '89ddff' },

    // Language-Specific: HTML
    { token: 'entity.name.tag.html', foreground: 'bfc7d5' },
    { token: 'tag.html', foreground: 'bfc7d5' },
    { token: 'entity.other.attribute-name.html', foreground: 'bfc7d5' },
    { token: 'attribute.name.html', foreground: 'bfc7d5' },
    { token: 'attribute.value.html', foreground: 'c3e88d' },
    { token: 'delimiter.html', foreground: 'c792ea' },
    { token: 'comment.html', foreground: '697098', fontStyle: 'italic' },
    { token: 'meta.tag.html', foreground: 'c792ea' },
    { token: 'punctuation.definition.tag.html', foreground: 'c792ea' },

    // Language-Specific: CSS
    { token: 'entity.name.tag.css', foreground: 'ff5572' },
    { token: 'entity.other.attribute-name.class.css', foreground: 'ffcb6b' },
    { token: 'entity.other.attribute-name.id.css', foreground: '82aaff' },
    { token: 'support.type.property-name.css', foreground: 'c084fc' },
    { token: 'support.constant.property-value.css', foreground: 'f78c6c' },
    { token: 'keyword.other.unit.css', foreground: 'f78c6c' },

    // Errors & Warnings
    { token: 'invalid', foreground: 'ff5572' },
    { token: 'invalid.illegal', foreground: 'ff5572' },
    { token: 'invalid.deprecated', foreground: 'f78c6c' },
  ],
  colors: {
    // Editor Background - transparent, let box handle background
    // Falls back to CSS var(--bg-input) in _code.scss
    'editor.background': '#00000000', // Transparent
    'editor.foreground': '#bfc7d5',

    // Editor Lines - transparent to inherit box background
    'editor.lineHighlightBackground': '#00000000', // Transparent
    'editorLineNumber.foreground': '#676E95',
    'editorLineNumber.activeForeground': '#c084fc',

    // Editor Cursor & Selection
    'editorCursor.foreground': '#c084fc', // Purple cursor for dark theme
    'editor.selectionBackground': '#717CB450', // Visible selection
    'editor.inactiveSelectionBackground': '#717CB430',
    'editor.selectionHighlightBackground': '#717CB420',

    // Editor Gutter - transparent to inherit box background
    'editorGutter.background': '#00000000', // Transparent
    'editorGutter.modifiedBackground': '#82aaff',
    'editorGutter.addedBackground': '#c3e88d',
    'editorGutter.deletedBackground': '#ff5572',

    // Editor Widgets
    'editorWidget.background': '#1e1e2e',
    'editorWidget.border': '#676E95',
    'editorSuggestWidget.background': '#1e1e2e',
    'editorSuggestWidget.border': '#676E95',
    'editorSuggestWidget.selectedBackground': '#717CB440',

    // Sticky Scroll - match box background with subtle border
    'editorStickyScroll.background': '#292d3e',
    'editorStickyScroll.border': '#676E9540',
    'editorStickyScrollHover.background': '#292d3e',
    'editorStickyScroll.shadow': '#00000000',
    'editorStickyScrollGutter.background': '#292d3e',

    // Hover Widgets - Tooltips and hover information
    'editorHoverWidget.background': '#1e1e2e',
    'editorHoverWidget.border': '#676E95',
    'editorHoverWidget.statusBarBackground': '#676E95',

    // Inline Hints - Type hints, parameter hints, inline suggestions
    'editorInlineHint.background': '#292d3e',
    'editorInlineHint.foreground': '#676E95',

    // Code Lens - Reference counts, test indicators
    'editorCodeLens.foreground': '#697098',

    // Ghost Text - Autocomplete suggestions shown inline
    'editorGhostText.foreground': '#676E9540',

    // Editor Whitespace & Indentation
    'editorWhitespace.foreground': '#676E9540',
    'editorIndentGuide.background': '#676E9520',
    'editorIndentGuide.activeBackground': '#676E95',

    // Scrollbar
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#676E9530',
    'scrollbarSlider.hoverBackground': '#676E9550',
    'scrollbarSlider.activeBackground': '#676E9570',

    // Bracket Matching
    'editorBracketMatch.background': '#676E9540',
    'editorBracketMatch.border': '#676E95',

    // Find/Replace
    'editor.findMatchBackground': '#717CB440',
    'editor.findMatchHighlightBackground': '#676E9530',
    'editor.findRangeHighlightBackground': '#676E9520',

    // Minimap
    'minimap.background': '#292d3e',
    'minimap.selectionHighlight': '#717CB440',
    'minimap.findMatchHighlight': '#717CB440',

    // Overview Ruler
    'editorOverviewRuler.border': '#676E9520',
    'editorOverviewRuler.modifiedForeground': '#82aaff',
    'editorOverviewRuler.addedForeground': '#c3e88d',
    'editorOverviewRuler.deletedForeground': '#ff5572',

    // Peek View
    'peekView.border': '#676E95',
    'peekViewEditor.background': '#1e1e2e',
    'peekViewResult.background': '#1e1e2e',
    'peekViewTitle.background': '#1e1e2e',

    // Diff Editor
    'diffEditor.insertedTextBackground': '#c3e88d20',
    'diffEditor.removedTextBackground': '#ff557220',
  },
};

/**
 * Register the palenight theme with Monaco Editor
 * Call this function before creating any editor instances
 */
export function registerPalenightTheme(monaco: typeof import('monaco-editor')) {
  monaco.editor.defineTheme('elbTheme-dark', palenightTheme);
}
