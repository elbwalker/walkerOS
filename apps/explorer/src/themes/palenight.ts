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
import { ELB_THEME_DARK } from './names';
import { tokenGroupsToMonacoRules, type TokenGroup } from './token-groups';

// Semantic color palette — change a hex here, it flows to every scope that uses it.
const C = {
  comment: '697098',
  string: 'c3e88d',
  regexp: '89ddff',
  number: 'f78c6c',
  keyword: 'c084fc',
  operator: '89ddff',
  function: '82aaff',
  type: 'ffcb6b',
  variable: 'bfc7d5',
  bool: 'ff5874',
  punctuation: 'c792ea',
  tag: 'ff5572',
  namespace: 'b2ccd6',
  url: 'dddddd',
  invalid: 'ff5572',
  invalidDep: 'f78c6c',
  cssSelector: 'ff5572',
  cssId: '82aaff',
  cssProperty: 'c084fc',
} as const;

// Token groups pool Monarch token names (Monaco) + TextMate scopes (Shiki).
// Both engines consume the SAME list — change a group, both pick up.
//
// ORDER MATTERS: more-specific scopes should come AFTER broader ones so they
// win when both match. Monaco walks `rules[]` top-to-bottom and (like
// TextMate) later rules override earlier ones for the same scope.
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
      // HTML/JSX attribute values stay in string color (matches prior rule)
      'attribute.value.html',
    ],
  },

  // Regex (cyan — distinct from plain strings)
  {
    foreground: C.regexp,
    scopes: ['string.regexp'],
  },

  // Numbers
  {
    foreground: C.number,
    scopes: [
      'number',
      'number.hex',
      'number.binary',
      'number.octal',
      'number.float',
      'constant.numeric',
      'constant.numeric.decimal',
      'constant.numeric.integer',
      'constant.numeric.float',
      'constant.numeric.hex',
      'constant.numeric.binary',
      'constant.numeric.octal',
      'keyword.other.unit',
    ],
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

  // Operators — cyan
  {
    foreground: C.operator,
    scopes: [
      'operator',
      'operators',
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

  // Variables / identifiers / property names — unified light gray
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

  // Constants & built-ins (blue — matches function color per Prism palenight)
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
    foreground: C.punctuation,
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

  // Tags (HTML/XML/JSX) — red/pink accent
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
    foreground: C.keyword,
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
    foreground: C.type,
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
    foreground: C.number,
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

export const palenightTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: tokenGroupsToMonacoRules(TOKEN_GROUPS),
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
  monaco.editor.defineTheme(ELB_THEME_DARK, palenightTheme);
}
