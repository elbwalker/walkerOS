/**
 * Palenight code theme for Monaco Editor
 *
 * The dark code theme of walkerOS Explorer, also rendered by Shiki (CodeView)
 * and matching the docs' Prism theme. Every colour is a design constant: the
 * `syntax-*` tokens for code, the `code-*` tokens for the editor UI.
 */

import type { editor } from 'monaco-editor';
import {
  codeBar,
  codeBg,
  codeBorder,
  codeDeletedBg,
  codeFg,
  codeInsertedBg,
  codeLineNumber,
  codeSelection,
  primary,
  syntaxComment,
  syntaxConstant,
  syntaxFunction,
  syntaxKeyword,
  syntaxNamespace,
  syntaxNumber,
  syntaxOperator,
  syntaxPunct,
  syntaxString,
  syntaxTag,
  syntaxType,
} from '../design';
import { tokenGroupsToMonacoRules, type TokenGroup } from './token-groups';

/** Monaco rules take a colour without the leading `#`. */
const rule = (color: string): string => color.replace(/^#/, '');

// Semantic palette: each role reads one design constant, and every scope
// that uses the role follows it.
const C = {
  comment: rule(syntaxComment),
  string: rule(syntaxString),
  regexp: rule(syntaxOperator),
  number: rule(syntaxNumber),
  keyword: rule(syntaxKeyword),
  operator: rule(syntaxOperator),
  function: rule(syntaxFunction),
  type: rule(syntaxType),
  variable: rule(codeFg),
  bool: rule(syntaxConstant),
  punctuation: rule(syntaxPunct),
  tag: rule(syntaxTag),
  namespace: rule(syntaxNamespace),
  url: rule(codeFg),
  invalid: rule(syntaxTag),
  invalidDep: rule(syntaxNumber),
  cssSelector: rule(syntaxTag),
  cssId: rule(syntaxFunction),
  cssProperty: rule(syntaxKeyword),
} as const;

// Token groups pool Monarch token names (Monaco) + TextMate scopes (Shiki).
// Both engines consume the SAME list: change a group, both pick it up.
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
      // HTML/JSX attribute values stay in the string colour
      'attribute.value.html',
    ],
  },

  // Regex (operator colour, distinct from plain strings)
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

  // Keywords, italic
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

  // Keyword "other", same colour, upright
  {
    foreground: C.keyword,
    scopes: ['keyword.other'],
  },

  // Operators
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

  // Variables, identifiers and property names: the plain code colour
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
      // Object keys: JSON, TS, JS
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

  // Constants and built-ins (the function colour)
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

  // Attribute names, in the string colour
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

  // Language-specific: HTML tag names and attributes render as identifiers
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
    // Editor
    'editor.background': codeBg,
    'editor.foreground': codeFg,
    'editor.lineHighlightBackground': codeBg,
    'editorLineNumber.foreground': codeLineNumber,
    'editorLineNumber.activeForeground': codeFg,

    // Cursor and selection
    'editorCursor.foreground': primary.dark,
    'editor.selectionBackground': codeSelection,
    'editor.inactiveSelectionBackground': codeSelection,
    'editor.selectionHighlightBackground': codeSelection,

    // Gutter: change markers take the syntax colours of inserted, deleted
    // and changed code
    'editorGutter.background': codeBg,
    'editorGutter.modifiedBackground': syntaxFunction,
    'editorGutter.addedBackground': syntaxString,
    'editorGutter.deletedBackground': syntaxTag,

    // Widgets: the code bar with a code border, no shadow
    'editorWidget.background': codeBar,
    'editorWidget.border': codeBorder,
    'editorSuggestWidget.background': codeBar,
    'editorSuggestWidget.border': codeBorder,
    'editorSuggestWidget.selectedBackground': codeSelection,

    // Sticky scroll: the panel colour, its shadow drawn in the same colour
    'editorStickyScroll.background': codeBg,
    'editorStickyScroll.border': codeBorder,
    'editorStickyScrollHover.background': codeBar,
    'editorStickyScroll.shadow': codeBg,
    'editorStickyScrollGutter.background': codeBg,

    // Hover widgets
    'editorHoverWidget.background': codeBar,
    'editorHoverWidget.border': codeBorder,
    'editorHoverWidget.statusBarBackground': codeBar,

    // Inline hints, code lens, ghost text
    'editorInlineHint.background': codeBar,
    'editorInlineHint.foreground': codeLineNumber,
    'editorCodeLens.foreground': codeLineNumber,
    'editorGhostText.foreground': codeLineNumber,

    // Whitespace and indentation
    'editorWhitespace.foreground': codeBorder,
    'editorIndentGuide.background': codeBorder,
    'editorIndentGuide.activeBackground': codeLineNumber,

    // Scrollbar
    'scrollbar.shadow': codeBg,
    'scrollbarSlider.background': codeSelection,
    'scrollbarSlider.hoverBackground': codeLineNumber,
    'scrollbarSlider.activeBackground': codeLineNumber,

    // Bracket matching
    'editorBracketMatch.background': codeSelection,
    'editorBracketMatch.border': codeLineNumber,

    // Find and replace
    'editor.findMatchBackground': codeSelection,
    'editor.findMatchHighlightBackground': codeSelection,
    'editor.findRangeHighlightBackground': codeSelection,

    // Minimap
    'minimap.background': codeBg,
    'minimap.selectionHighlight': codeSelection,
    'minimap.findMatchHighlight': codeSelection,

    // Overview ruler
    'editorOverviewRuler.border': codeBorder,
    'editorOverviewRuler.modifiedForeground': syntaxFunction,
    'editorOverviewRuler.addedForeground': syntaxString,
    'editorOverviewRuler.deletedForeground': syntaxTag,

    // Peek view
    'peekView.border': codeBorder,
    'peekViewEditor.background': codeBar,
    'peekViewResult.background': codeBar,
    'peekViewTitle.background': codeBar,

    // Diff editor
    'diffEditor.insertedTextBackground': codeInsertedBg,
    'diffEditor.removedTextBackground': codeDeletedBg,
  },
};
