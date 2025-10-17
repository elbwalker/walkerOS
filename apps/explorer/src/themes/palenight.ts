/**
 * Palenight Theme for Monaco Editor
 *
 * Colors and token mappings based on prism-react-renderer palenight theme
 * Source: https://github.com/FormidableLabs/prism-react-renderer/blob/master/packages/prism-react-renderer/src/themes/palenight.ts
 *
 * This theme provides consistent syntax highlighting between:
 * - Website (using prism-react-renderer palenight)
 * - Explorer (using Monaco Editor with this theme)
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

    // Strings
    { token: 'string', foreground: 'c3e88d' },
    { token: 'string.quoted', foreground: 'c3e88d' },
    { token: 'string.template', foreground: 'c3e88d' },
    { token: 'string.regexp', foreground: '89ddff' },

    // Numbers
    { token: 'number', foreground: 'f78c6c' },
    { token: 'number.hex', foreground: 'f78c6c' },
    { token: 'number.binary', foreground: 'f78c6c' },
    { token: 'number.octal', foreground: 'f78c6c' },
    { token: 'number.float', foreground: 'f78c6c' },

    // Keywords
    { token: 'keyword', foreground: 'c792ea', fontStyle: 'italic' },
    { token: 'keyword.control', foreground: 'c792ea', fontStyle: 'italic' },
    { token: 'keyword.operator', foreground: '89ddff' },
    { token: 'keyword.other', foreground: 'c792ea' },

    // Operators
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

    // Delimiters & Punctuation
    { token: 'delimiter', foreground: 'c792ea' },
    { token: 'delimiter.bracket', foreground: 'c792ea' },
    { token: 'delimiter.parenthesis', foreground: 'c792ea' },
    { token: 'delimiter.square', foreground: 'c792ea' },
    { token: 'punctuation', foreground: 'c792ea' },

    // Tags (HTML/XML/JSX)
    { token: 'tag', foreground: 'ff5572' },
    { token: 'meta.tag', foreground: 'ff5572' },
    { token: 'entity.name.tag', foreground: 'ff5572' },

    // Tag Attributes
    { token: 'attribute.name', foreground: 'ffcb6b' },
    { token: 'entity.other.attribute-name', foreground: 'ffcb6b' },

    // Namespaces
    { token: 'namespace', foreground: 'b2ccd6' },
    { token: 'entity.name.namespace', foreground: 'b2ccd6' },

    // URLs
    { token: 'markup.underline.link', foreground: 'dddddd' },

    // Doctype
    {
      token: 'meta.tag.sgml.doctype',
      foreground: 'c792ea',
      fontStyle: 'italic',
    },

    // JSON Keys (using string color - green like other string values)
    { token: 'support.type.property-name', foreground: 'c3e88d' },
    { token: 'string.key', foreground: 'c3e88d' },
    { token: 'string.key.json', foreground: 'c3e88d' },
    { token: 'support.type.property-name.json', foreground: 'c3e88d' },
    {
      token: 'meta.structure.dictionary.json string.quoted.double.json',
      foreground: 'c3e88d',
    },

    // Markdown
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.heading', foreground: 'c792ea', fontStyle: 'bold' },

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
    { token: 'entity.name.tag.html', foreground: 'ff5572' },
    { token: 'entity.other.attribute-name.html', foreground: 'ffcb6b' },
    { token: 'meta.tag.html', foreground: 'bfc7d5' },
    { token: 'punctuation.definition.tag.html', foreground: 'c792ea' },

    // Language-Specific: CSS
    { token: 'entity.name.tag.css', foreground: 'ff5572' },
    { token: 'entity.other.attribute-name.class.css', foreground: 'ffcb6b' },
    { token: 'entity.other.attribute-name.id.css', foreground: '82aaff' },
    { token: 'support.type.property-name.css', foreground: 'c792ea' },
    { token: 'support.constant.property-value.css', foreground: 'f78c6c' },
    { token: 'keyword.other.unit.css', foreground: 'f78c6c' },

    // Errors & Warnings
    { token: 'invalid', foreground: 'ff5572' },
    { token: 'invalid.illegal', foreground: 'ff5572' },
    { token: 'invalid.deprecated', foreground: 'f78c6c' },
  ],
  colors: {
    // Editor Background
    'editor.background': '#292d3e',
    'editor.foreground': '#bfc7d5',

    // Editor Lines
    'editor.lineHighlightBackground': '#2a2f40',
    'editorLineNumber.foreground': '#676E95',
    'editorLineNumber.activeForeground': '#c792ea',

    // Editor Cursor & Selection
    'editorCursor.foreground': '#ffcc00',
    'editor.selectionBackground': '#717CB440',
    'editor.inactiveSelectionBackground': '#717CB420',
    'editor.selectionHighlightBackground': '#676E9550',

    // Editor Gutter
    'editorGutter.background': '#292d3e',
    'editorGutter.modifiedBackground': '#82aaff',
    'editorGutter.addedBackground': '#c3e88d',
    'editorGutter.deletedBackground': '#ff5572',

    // Editor Widgets
    'editorWidget.background': '#1e1e2e',
    'editorWidget.border': '#676E95',
    'editorSuggestWidget.background': '#1e1e2e',
    'editorSuggestWidget.border': '#676E95',
    'editorSuggestWidget.selectedBackground': '#717CB440',

    // Editor Whitespace & Indentation
    'editorWhitespace.foreground': '#676E9540',
    'editorIndentGuide.background': '#676E9520',
    'editorIndentGuide.activeBackground': '#676E95',

    // Scrollbar
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
  monaco.editor.defineTheme('palenight', palenightTheme);
}
