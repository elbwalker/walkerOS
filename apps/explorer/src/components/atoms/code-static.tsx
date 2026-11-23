import React from 'react';
import {
  createHighlighterCoreSync,
  type HighlighterCore,
  type ShikiTransformer,
} from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import json from 'shiki/langs/json.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import bash from 'shiki/langs/bash.mjs';
import html from 'shiki/langs/html.mjs';
import css from 'shiki/langs/css.mjs';
import { ELB_THEME_DARK } from '../../themes';
import { palenightTheme } from '../../themes/palenight';
import { monacoThemeToShiki } from '../../themes/shiki-adapter';

/** A line to point at: `add` for a new line, `focus` for the one a step is about. */
export interface CodeStaticMark {
  /** The line, counted from 1. */
  line: number;
  kind: 'add' | 'focus';
}

export interface CodeStaticProps {
  code: string;
  language?: string;
  className?: string;
  /** Marked lines; a mark beyond the last line is ignored. */
  marks?: readonly CodeStaticMark[];
  /** Numbers the lines from 1. */
  lineNumbers?: boolean;
  /**
   * Shows only the first `reveal` characters, with a caret after the last: a
   * typing effect. The whole code is highlighted first, so a token keeps its
   * colour while it is typed.
   */
  reveal?: number;
  /**
   * Types one line: `line` (counted from 1) shows its first `chars`
   * characters with a caret after them, every other line shows in full. A
   * line beyond the last is ignored. `reveal` wins when both are set.
   */
  typing?: CodeStaticTyping;
}

/** The line being typed and how many of its characters show. */
export interface CodeStaticTyping {
  /** The line, counted from 1. */
  line: number;
  chars: number;
}

// Pinned language set. Extend here (and the imports above) when docs need a new
// language. Names match Shiki's fine-grained lang ids.
const LANGS = [
  'json',
  'javascript',
  'typescript',
  'tsx',
  'bash',
  'html',
  'css',
] as const;

// Derive the Shiki theme from the same Monaco theme CodeBox uses, so CodeView
// (Shiki) and CodeBox (Monaco) render identical colors. Code is dark in both
// page themes, so there is one theme.
const ELB_SHIKI_DARK = monacoThemeToShiki(palenightTheme, {
  name: ELB_THEME_DARK,
});

let highlighter: HighlighterCore | null = null;

// Lazily build a synchronous, WASM-free highlighter on first render. Touches no
// browser globals at import time, so it is safe under SSR.
function getHighlighterSync(): HighlighterCore {
  if (!highlighter) {
    highlighter = createHighlighterCoreSync({
      themes: [ELB_SHIKI_DARK],
      langs: [json, javascript, typescript, tsx, bash, html, css],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighter;
}

function resolveLang(language: string): string {
  return (LANGS as readonly string[]).includes(language) ? language : 'text';
}

// Marks `<code>` with `language-<lang>`, the convention HTML-to-Markdown
// converters read, so the docs Markdown export (converted from this HTML)
// writes a fence with a language. Takes the caller's language, not the
// resolved one: a fence can name `yaml` even though it renders as plain text.
function languageClass(language: string): ShikiTransformer {
  return {
    name: 'elb-language-class',
    code(node) {
      this.addClassToHast(node, `language-${language}`);
    },
  };
}

type HastElement = Parameters<NonNullable<ShikiTransformer['line']>>[0];
type HastContent = HastElement['children'][number];

const MARKS: Readonly<
  Record<CodeStaticMark['kind'], { glyph: string; word: string }>
> = {
  add: { glyph: '+', word: 'added' },
  focus: { glyph: '›', word: 'in focus' },
};

function span(className: string, children: HastContent[]): HastElement {
  return {
    type: 'element',
    tagName: 'span',
    properties: { class: className },
    children,
  };
}

function text(value: string): HastContent {
  return { type: 'text', value };
}

/** Where each line starts in `code`, split as Shiki splits lines. */
function lineStarts(code: string): number[] {
  const starts = [0];
  for (const match of code.matchAll(/\r\n|\r|\n/g))
    starts.push((match.index ?? 0) + match[0].length);
  return starts;
}

// Cuts the highlighted tokens after `reveal` characters; lines that start
// later are not typed yet.
function revealTokens(code: string, reveal: number): ShikiTransformer {
  const starts = lineStarts(code);
  return {
    name: 'elb-reveal',
    tokens(lines) {
      return lines
        .filter((_, index) => (starts[index] ?? 0) <= reveal)
        .map((line) =>
          line.flatMap((token) => {
            const left = reveal - token.offset;
            if (left <= 0) return [];
            return left >= token.content.length
              ? [token]
              : [{ ...token, content: token.content.slice(0, left) }];
          }),
        );
    },
  };
}

// Cuts the highlighted tokens of one line after `chars` characters; the
// other lines stay whole.
function typeLine(code: string, typing: CodeStaticTyping): ShikiTransformer {
  const start = lineStarts(code)[typing.line - 1] ?? 0;
  const end = start + Math.max(0, typing.chars);
  return {
    name: 'elb-type-line',
    tokens(lines) {
      return lines.map((line, index) =>
        index !== typing.line - 1
          ? line
          : line.flatMap((token) => {
              const left = end - token.offset;
              if (left <= 0) return [];
              return left >= token.content.length
                ? [token]
                : [{ ...token, content: token.content.slice(0, left) }];
            }),
      );
    },
  };
}

// The gutter (numbers, mark glyphs with their words) and the caret. The gutter
// is aria-hidden glyphs plus a word for assistive technology, so a mark never
// reads by colour alone.
function lineDecor(
  marks: readonly CodeStaticMark[],
  lineNumbers: boolean,
  caretLine: number | null,
): ShikiTransformer {
  return {
    name: 'elb-line-decor',
    line(node, line) {
      const mark = marks.find((entry) => entry.line === line);
      const gutter: HastContent[] = [];
      if (lineNumbers) {
        const number = span('elb-code-static__number', [text(String(line))]);
        number.properties['aria-hidden'] = 'true';
        gutter.push(number);
      }
      if (marks.length > 0) {
        const cue = mark ? MARKS[mark.kind] : undefined;
        const glyph = span('elb-code-static__glyph', [text(cue?.glyph ?? ' ')]);
        glyph.properties['aria-hidden'] = 'true';
        gutter.push(
          span(
            'elb-code-static__mark',
            cue
              ? [glyph, span('elb-code-static__word', [text(cue.word)])]
              : [glyph],
          ),
        );
      }
      if (mark) node.properties['data-mark'] = mark.kind;
      node.children.unshift(...gutter);
      if (line === caretLine) {
        const caret = span('elb-code-static__caret', []);
        caret.properties['aria-hidden'] = 'true';
        node.children.push(caret);
      }
    },
  };
}

export function CodeStatic({
  code,
  language,
  className,
  marks = [],
  lineNumbers = false,
  reveal,
  typing,
}: CodeStaticProps): React.ReactElement {
  const lang = language || 'json';
  const starts = lineStarts(code);
  const typed =
    reveal !== undefined && reveal < code.length ? Math.max(0, reveal) : null;
  const typedLine =
    reveal === undefined &&
    typing !== undefined &&
    typing.line >= 1 &&
    typing.line <= starts.length
      ? typing
      : null;
  const caretLine =
    typed !== null
      ? starts.filter((start) => start <= typed).length
      : (typedLine?.line ?? null);
  const transformers: ShikiTransformer[] = [languageClass(lang)];
  if (typed !== null) transformers.push(revealTokens(code, typed));
  if (typedLine !== null) transformers.push(typeLine(code, typedLine));
  if (marks.length > 0 || lineNumbers || caretLine !== null)
    transformers.push(lineDecor(marks, lineNumbers, caretLine));
  const rendered = getHighlighterSync().codeToHtml(code, {
    lang: resolveLang(lang),
    theme: ELB_THEME_DARK,
    transformers,
  });

  const wrapperClass = [
    'elb-code-static',
    marks.length > 0 && 'elb-code-static--marks',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={wrapperClass}
      data-theme="dark"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
