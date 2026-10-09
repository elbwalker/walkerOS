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

export interface CodeStaticProps {
  code: string;
  language?: string;
  className?: string;
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

export function CodeStatic({
  code,
  language,
  className,
}: CodeStaticProps): React.ReactElement {
  const lang = language || 'json';
  const rendered = getHighlighterSync().codeToHtml(code, {
    lang: resolveLang(lang),
    theme: ELB_THEME_DARK,
    transformers: [languageClass(lang)],
  });

  const wrapperClass = `elb-code-static${className ? ` ${className}` : ''}`;

  return (
    <div
      className={wrapperClass}
      data-theme="dark"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
