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
import { ELB_THEME_LIGHT } from './names';
import { tokenGroupsToMonacoRules, type TokenGroup } from './token-groups';

// Semantic color palette — change a hex here, it flows to every scope that uses it.
const C = {
  comment: '6A737D',
  string: '22863A',
  regexp: '032F62',
  number: 'D73A49',
  numericConstant: 'fb923c',
  keyword: '6F42C1',
  operator: '01b5e2', // Brand cyan — `operator` / `operators` tokens only
  operatorKeyword: '0086B3', // Darker teal — `keyword.operator*`
  function: '005CC5',
  type: 'B08800',
  variable: '24292E',
  bool: 'ef4444',
  tag: 'D73A49',
  namespace: '6F42C1',
  url: '005CC5',
  invalid: 'CB2431',
  invalidDep: 'D73A49',
  cssSelector: 'D73A49',
  cssClass: 'B08800',
  cssId: '005CC5',
  cssProperty: '6F42C1',
  cssValue: 'D73A49',
} as const;

// Token groups pool Monarch token names (Monaco) + TextMate scopes (Shiki).
// Both engines consume the SAME list — change a group, both pick up.
const TOKEN_GROUPS: TokenGroup[] = [
  // Comments
  {
    foreground: C.comment,
    fontStyle: 'italic',
    scopes: [
      'comment',
      'comment.block',
      'comment.line',
      'comment.html',
      'comment.line.double-slash',
      'comment.line.number-sign',
      'comment.block.documentation',
      'punctuation.definition.comment',
    ],
  },

  // Strings (generic)
  {
    foreground: C.string,
    scopes: [
      'string',
      'string.quoted',
      'string.template',
      'string.value.json',
      'string.json',
      'string.html',
      'string.css',
      'string.js',
      'string.ts',
      'string.quoted.single',
      'string.quoted.double',
      'string.quoted.triple',
      'punctuation.definition.string',
      'punctuation.definition.string.begin',
      'punctuation.definition.string.end',
      'meta.string',
      'attribute.value.html',
    ],
  },

  // Regex
  {
    foreground: C.regexp,
    scopes: ['string.regexp'],
  },

  // Numbers (base)
  {
    foreground: C.number,
    scopes: [
      'number',
      'number.hex',
      'number.binary',
      'number.octal',
      'number.float',
      'constant.numeric.decimal',
      'constant.numeric.integer',
      'constant.numeric.float',
      'constant.numeric.hex',
      'constant.numeric.binary',
      'constant.numeric.octal',
      'keyword.other.unit',
    ],
  },

  // Numeric constants (distinct hex in original theme)
  {
    foreground: C.numericConstant,
    scopes: ['constant.numeric'],
  },

  // Keywords — italic
  {
    foreground: C.keyword,
    fontStyle: 'italic',
    scopes: [
      'keyword',
      'keyword.control',
      'keyword.control.flow',
      'keyword.control.import',
      'keyword.control.conditional',
      'keyword.control.loop',
      'storage.type',
      'storage.modifier',
      'keyword.declaration',
    ],
  },

  // Keyword "other" — same color, upright
  {
    foreground: C.keyword,
    scopes: ['keyword.other'],
  },

  // `operator` / `operators` — brand cyan (Monarch tokens)
  {
    foreground: C.operator,
    scopes: ['operator', 'operators'],
  },

  // `keyword.operator*` — darker teal
  {
    foreground: C.operatorKeyword,
    scopes: [
      'keyword.operator',
      'keyword.operator.assignment',
      'keyword.operator.arithmetic',
      'keyword.operator.logical',
      'keyword.operator.comparison',
      'keyword.operator.type',
      'keyword.operator.type.ts',
    ],
  },

  // Functions
  {
    foreground: C.function,
    scopes: [
      'function',
      'identifier.function',
      'support.function',
      'entity.name.function',
      'meta.function-call',
      'meta.function-call.entity.name.function',
      'variable.function',
    ],
  },

  // Types & classes
  {
    foreground: C.type,
    scopes: [
      'type',
      'type.identifier',
      'entity.name.type',
      'entity.name.class',
      'support.type',
      'support.class',
      'support.type.primitive.ts',
      'support.type.primitive.js',
      'entity.name.type.ts',
      'entity.name.type.js',
      'meta.type.annotation',
      'meta.type.annotation.ts',
      'entity.other.inherited-class',
      'storage.type.class',
      'storage.type.function',
      'storage.type.interface',
      'support.type.primitive',
    ],
  },

  // Variables / identifiers / property names — near-black
  {
    foreground: C.variable,
    scopes: [
      'variable',
      'variable.name',
      'variable.parameter',
      'variable.parameter.ts',
      'variable.parameter.js',
      'variable.other',
      'variable.other.readwrite',
      'variable.other.constant',
      'variable.language',
      'meta.definition.variable',
      'identifier',
      'identifier.ts',
      'identifier.js',
      // Object keys — JSON, TS, JS
      'support.type.property-name',
      'support.type.property-name.json',
      'string.key.json',
      'string.name.tag.json',
      'meta.object-literal.key',
      'variable.other.property',
      'variable.other.object.property',
      'variable.other.constant.property',
    ],
  },

  // Constants & built-ins — deep blue
  {
    foreground: C.function,
    scopes: ['constant', 'constant.character', 'support.constant'],
  },

  // Booleans / null / language constants
  {
    foreground: C.bool,
    scopes: [
      'constant.language',
      'constant.language.boolean',
      'constant.language.null',
      'constant.language.undefined',
      'constant.language.boolean.true',
      'constant.language.boolean.false',
      'keyword.constant.boolean',
    ],
  },

  // Delimiters & punctuation
  {
    foreground: C.variable,
    scopes: [
      'delimiter',
      'delimiter.bracket',
      'delimiter.parenthesis',
      'delimiter.square',
      'delimiter.html',
      'punctuation',
      'punctuation.separator',
      'punctuation.definition',
      'punctuation.terminator',
      'punctuation.section',
      'meta.brace',
      'meta.brace.round',
      'meta.brace.square',
      'meta.brace.curly',
      'meta.tag.html',
      'punctuation.definition.tag.html',
    ],
  },

  // Tags (HTML/XML/JSX)
  {
    foreground: C.tag,
    scopes: [
      'tag',
      'meta.tag',
      'entity.name.tag',
      'entity.name.tag.tsx',
      'entity.name.tag.jsx',
      'punctuation.definition.tag',
      'punctuation.definition.tag.begin',
      'punctuation.definition.tag.end',
    ],
  },

  // Attribute names — string color (matches prior theme intent)
  {
    foreground: C.string,
    scopes: ['attribute.name', 'entity.other.attribute-name', 'meta.attribute'],
  },

  // Namespaces
  {
    foreground: C.namespace,
    scopes: ['namespace', 'entity.name.namespace', 'storage.type.namespace'],
  },

  // URLs / links
  {
    foreground: C.url,
    scopes: ['markup.underline.link', 'string.other.link'],
  },

  // Doctype
  {
    foreground: C.comment,
    fontStyle: 'italic',
    scopes: ['meta.tag.sgml.doctype'],
  },

  // Markdown
  {
    fontStyle: 'bold',
    scopes: ['markup.bold'],
  },
  {
    fontStyle: 'italic',
    scopes: ['markup.italic'],
  },
  {
    foreground: C.keyword,
    fontStyle: 'bold',
    scopes: ['markup.heading'],
  },
  {
    foreground: C.string,
    scopes: ['markup.raw'],
  },
  {
    foreground: C.comment,
    fontStyle: 'italic',
    scopes: ['markup.quote'],
  },
  {
    foreground: C.variable,
    scopes: ['markup.list'],
  },

  // Language-Specific: HTML — tag names/attributes rendered as identifiers
  {
    foreground: C.variable,
    scopes: [
      'entity.name.tag.html',
      'tag.html',
      'entity.other.attribute-name.html',
      'attribute.name.html',
    ],
  },

  // Language-Specific: CSS
  {
    foreground: C.cssSelector,
    scopes: ['entity.name.tag.css'],
  },
  {
    foreground: C.cssClass,
    scopes: ['entity.other.attribute-name.class.css'],
  },
  {
    foreground: C.cssId,
    scopes: ['entity.other.attribute-name.id.css'],
  },
  {
    foreground: C.cssProperty,
    scopes: ['support.type.property-name.css'],
  },
  {
    foreground: C.cssValue,
    scopes: ['support.constant.property-value.css', 'keyword.other.unit.css'],
  },

  // Errors / invalid
  {
    foreground: C.invalid,
    scopes: ['invalid', 'invalid.illegal'],
  },
  {
    foreground: C.invalidDep,
    scopes: ['invalid.deprecated'],
  },
];

export const lighthouseTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: tokenGroupsToMonacoRules(TOKEN_GROUPS),
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
  monaco.editor.defineTheme(ELB_THEME_LIGHT, lighthouseTheme);
}
