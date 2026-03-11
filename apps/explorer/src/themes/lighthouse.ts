/**
 * Lighthouse Theme for Monaco Editor
 *
 * Custom light theme for walkerOS Explorer, designed to complement the Palenight dark theme.
 * Based on VS Code Light+ with adjustments for optimal readability and brand consistency.
 *
 * Color Palette Strategy:
 * - Comments: Muted green (#6A737D) for subtle annotations
 * - Strings: Dark green (#22863A) for clear text distinction
 * - Numbers: Brick red (#D73A49) for numeric emphasis
 * - Functions: Deep blue (#005CC5) for callable identification
 * - Keywords: Purple (#6F42C1) maintaining syntax hierarchy
 * - Variables: Near black (#24292E) for primary code elements
 * - Types/Classes: Dark gold (#B08800) for type definitions
 * - Tags: Red (#D73A49) for HTML/JSX elements
 * - Operators: Teal (#0086B3) for logical operations
 * - Booleans: Red (#D73A49) for literal values
 */

import type { editor } from 'monaco-editor';

export const lighthouseTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '6A737D', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '6A737D', fontStyle: 'italic' },

    // Strings - dark green for good contrast on white
    { token: 'string', foreground: '22863A' },
    { token: 'string.quoted', foreground: '22863A' },
    { token: 'string.template', foreground: '22863A' },
    { token: 'string.regexp', foreground: '032F62' },

    // Language-specific strings (Monaco uses these exact token names)
    { token: 'string.value.json', foreground: '22863A' },
    { token: 'string.json', foreground: '22863A' },
    { token: 'string.html', foreground: '22863A' },
    { token: 'string.css', foreground: '22863A' },
    { token: 'string.js', foreground: '22863A' },
    { token: 'string.ts', foreground: '22863A' },

    // Numbers - dark red/burgundy for contrast
    { token: 'number', foreground: 'D73A49' },
    { token: 'number.hex', foreground: 'D73A49' },
    { token: 'number.binary', foreground: 'D73A49' },
    { token: 'number.octal', foreground: 'D73A49' },
    { token: 'number.float', foreground: 'D73A49' },

    // Keywords - dark purple for contrast
    { token: 'keyword', foreground: '6F42C1', fontStyle: 'italic' },
    { token: 'keyword.control', foreground: '6F42C1', fontStyle: 'italic' },
    { token: 'keyword.operator', foreground: '0086B3' },
    { token: 'keyword.other', foreground: '6F42C1' },

    // Operators - cyan (brand color)
    { token: 'operator', foreground: '01b5e2' },
    { token: 'operators', foreground: '01b5e2' },

    // Functions
    { token: 'function', foreground: '005CC5' },
    { token: 'identifier.function', foreground: '005CC5' },
    { token: 'support.function', foreground: '005CC5' },
    { token: 'entity.name.function', foreground: '005CC5' },

    // Types & Classes
    { token: 'type', foreground: 'B08800' },
    { token: 'type.identifier', foreground: 'B08800' },
    { token: 'entity.name.type', foreground: 'B08800' },
    { token: 'entity.name.class', foreground: 'B08800' },
    { token: 'support.type', foreground: 'B08800' },
    { token: 'support.class', foreground: 'B08800' },

    // Variables
    { token: 'variable', foreground: '24292E' },
    { token: 'variable.name', foreground: '24292E' },
    { token: 'variable.parameter', foreground: '24292E' },

    // Constants & Built-ins
    { token: 'constant', foreground: '005CC5' },
    { token: 'constant.language', foreground: 'ef4444' },
    { token: 'constant.numeric', foreground: 'fb923c' },
    { token: 'constant.character', foreground: '005CC5' },
    { token: 'support.constant', foreground: '005CC5' },

    // Booleans - red/pink accent (matching screenshot)
    { token: 'constant.language.boolean', foreground: 'ef4444' },
    { token: 'keyword.constant.boolean', foreground: 'ef4444' },

    // Delimiters & Punctuation
    { token: 'delimiter', foreground: '24292E' },
    { token: 'delimiter.bracket', foreground: '24292E' },
    { token: 'delimiter.parenthesis', foreground: '24292E' },
    { token: 'delimiter.square', foreground: '24292E' },
    { token: 'punctuation', foreground: '24292E' },

    // Tags (HTML/XML/JSX)
    { token: 'tag', foreground: 'D73A49' },
    { token: 'meta.tag', foreground: 'D73A49' },
    { token: 'entity.name.tag', foreground: 'D73A49' },

    // Tag Attributes (using string color for consistency with Prism)
    { token: 'attribute.name', foreground: '22863A' },
    { token: 'entity.other.attribute-name', foreground: '22863A' },

    // Namespaces
    { token: 'namespace', foreground: '6F42C1' },
    { token: 'entity.name.namespace', foreground: '6F42C1' },

    // URLs
    { token: 'markup.underline.link', foreground: '005CC5' },

    // Doctype
    {
      token: 'meta.tag.sgml.doctype',
      foreground: '6A737D',
      fontStyle: 'italic',
    },

    // Object Keys - Unified near-black for all property names
    // Covers JSON, TypeScript, JavaScript object literals
    { token: 'support.type.property-name', foreground: '24292E' },
    { token: 'support.type.property-name.json', foreground: '24292E' },
    { token: 'string.key.json', foreground: '24292E' },
    { token: 'meta.object-literal.key', foreground: '24292E' },
    { token: 'variable.other.property', foreground: '24292E' },
    { token: 'identifier', foreground: '24292E' },
    { token: 'identifier.ts', foreground: '24292E' },
    { token: 'identifier.js', foreground: '24292E' },

    // Markdown
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.heading', foreground: '6F42C1', fontStyle: 'bold' },

    // Language-Specific: JavaScript/TypeScript
    { token: 'variable.parameter.ts', foreground: '24292E' },
    { token: 'variable.parameter.js', foreground: '24292E' },
    { token: 'support.type.primitive.ts', foreground: 'B08800' },
    { token: 'support.type.primitive.js', foreground: 'B08800' },
    { token: 'entity.name.type.ts', foreground: 'B08800' },
    { token: 'entity.name.type.js', foreground: 'B08800' },
    { token: 'meta.type.annotation.ts', foreground: 'B08800' },
    { token: 'keyword.operator.type.ts', foreground: '0086B3' },

    // Language-Specific: HTML
    { token: 'entity.name.tag.html', foreground: '24292E' },
    { token: 'tag.html', foreground: '24292E' },
    { token: 'entity.other.attribute-name.html', foreground: '24292E' },
    { token: 'attribute.name.html', foreground: '24292E' },
    { token: 'attribute.value.html', foreground: '22863A' },
    { token: 'delimiter.html', foreground: '24292E' },
    { token: 'comment.html', foreground: '6A737D', fontStyle: 'italic' },
    { token: 'meta.tag.html', foreground: '24292E' },
    { token: 'punctuation.definition.tag.html', foreground: '24292E' },

    // Language-Specific: CSS
    { token: 'entity.name.tag.css', foreground: 'D73A49' },
    { token: 'entity.other.attribute-name.class.css', foreground: 'B08800' },
    { token: 'entity.other.attribute-name.id.css', foreground: '005CC5' },
    { token: 'support.type.property-name.css', foreground: '6F42C1' },
    { token: 'support.constant.property-value.css', foreground: 'D73A49' },
    { token: 'keyword.other.unit.css', foreground: 'D73A49' },

    // Errors & Warnings
    { token: 'invalid', foreground: 'CB2431' },
    { token: 'invalid.illegal', foreground: 'CB2431' },
    { token: 'invalid.deprecated', foreground: 'D73A49' },
  ],
  colors: {
    // Editor Background - transparent, let box handle background
    'editor.background': '#00000000', // Transparent
    'editor.foreground': '#24292E',

    // Editor Lines - transparent to inherit box background
    'editor.lineHighlightBackground': '#00000000', // Transparent
    'editorLineNumber.foreground': '#1B1F2380',
    'editorLineNumber.activeForeground': '#6F42C1',

    // Editor Cursor & Selection
    'editorCursor.foreground': '#6F42C1', // Purple cursor for light theme
    'editor.selectionBackground': '#0366D630', // Visible blue selection
    'editor.inactiveSelectionBackground': '#0366D620',
    'editor.selectionHighlightBackground': '#0366D615',

    // Editor Gutter - transparent to inherit box background
    'editorGutter.background': '#00000000', // Transparent
    'editorGutter.modifiedBackground': '#005CC5',
    'editorGutter.addedBackground': '#28A745',
    'editorGutter.deletedBackground': '#D73A49',

    // Editor Widgets
    'editorWidget.background': '#F6F8FA',
    'editorWidget.border': '#E1E4E8',
    'editorSuggestWidget.background': '#F6F8FA',
    'editorSuggestWidget.border': '#E1E4E8',
    'editorSuggestWidget.selectedBackground': '#0366D625',

    // Sticky Scroll - match box background with subtle border
    'editorStickyScroll.background': '#ffffff',
    'editorStickyScroll.border': '#E1E4E8',
    'editorStickyScrollHover.background': '#ffffff',
    'editorStickyScroll.shadow': '#00000000',
    'editorStickyScrollGutter.background': '#ffffff',

    // Hover Widgets - Tooltips and hover information
    'editorHoverWidget.background': '#F6F8FA',
    'editorHoverWidget.border': '#E1E4E8',
    'editorHoverWidget.statusBarBackground': '#E1E4E8',

    // Inline Hints - Type hints, parameter hints, inline suggestions
    'editorInlineHint.background': '#F6F8FA',
    'editorInlineHint.foreground': '#6A737D',

    // Code Lens - Reference counts, test indicators
    'editorCodeLens.foreground': '#6A737D',

    // Ghost Text - Autocomplete suggestions shown inline
    'editorGhostText.foreground': '#1B1F2350',

    // Editor Whitespace & Indentation
    'editorWhitespace.foreground': '#1B1F2340',
    'editorIndentGuide.background': '#E1E4E820',
    'editorIndentGuide.activeBackground': '#E1E4E8',

    // Scrollbar
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#1B1F2330',
    'scrollbarSlider.hoverBackground': '#1B1F2350',
    'scrollbarSlider.activeBackground': '#1B1F2370',

    // Bracket Matching
    'editorBracketMatch.background': '#34D05840',
    'editorBracketMatch.border': '#34D058',

    // Find/Replace
    'editor.findMatchBackground': '#FFDF5D40',
    'editor.findMatchHighlightBackground': '#FFDF5D30',
    'editor.findRangeHighlightBackground': '#0366D620',

    // Minimap
    'minimap.background': '#FAFBFC',
    'minimap.selectionHighlight': '#0366D625',
    'minimap.findMatchHighlight': '#FFDF5D40',

    // Overview Ruler
    'editorOverviewRuler.border': '#E1E4E820',
    'editorOverviewRuler.modifiedForeground': '#005CC5',
    'editorOverviewRuler.addedForeground': '#28A745',
    'editorOverviewRuler.deletedForeground': '#D73A49',

    // Peek View
    'peekView.border': '#0366D6',
    'peekViewEditor.background': '#F6F8FA',
    'peekViewResult.background': '#FAFBFC',
    'peekViewTitle.background': '#F6F8FA',

    // Diff Editor
    'diffEditor.insertedTextBackground': '#28A74520',
    'diffEditor.removedTextBackground': '#D73A4920',
  },
};

/**
 * Register the lighthouse theme with Monaco Editor
 * Call this function before creating any editor instances
 */
export function registerLighthouseTheme(
  monaco: typeof import('monaco-editor'),
) {
  monaco.editor.defineTheme('elbTheme-light', lighthouseTheme);
}
