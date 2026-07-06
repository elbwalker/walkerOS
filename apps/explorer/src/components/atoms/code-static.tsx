import React from 'react';
import { createHighlighterCoreSync, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import json from 'shiki/langs/json.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import bash from 'shiki/langs/bash.mjs';
import html from 'shiki/langs/html.mjs';
import css from 'shiki/langs/css.mjs';
import { palenightTheme } from '../../themes/palenight';
import { lighthouseTheme } from '../../themes/lighthouse';
import { monacoThemeToShiki } from '../../themes/shiki-adapter';
import { ELB_THEME_DARK, ELB_THEME_LIGHT } from '../../themes/names';

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

// Derive Shiki themes from the same Monaco theme objects CodeBox uses,
// so CodeView (Shiki) and CodeBox (Monaco) render identical colors.
// Names match Monaco's `monaco.editor.setTheme(...)` keys.
const ELB_SHIKI_LIGHT = monacoThemeToShiki(lighthouseTheme, {
  name: ELB_THEME_LIGHT,
  type: 'light',
  defaultBackground: '#ffffff',
  defaultForeground: '#24292E',
});

const ELB_SHIKI_DARK = monacoThemeToShiki(palenightTheme, {
  name: ELB_THEME_DARK,
  type: 'dark',
  defaultBackground: '#292d3e',
  defaultForeground: '#bfc7d5',
});

let highlighter: HighlighterCore | null = null;

// Lazily build a synchronous, WASM-free highlighter on first render. Touches no
// browser globals at import time, so it is safe under SSR.
function getHighlighterSync(): HighlighterCore {
  if (!highlighter) {
    highlighter = createHighlighterCoreSync({
      themes: [ELB_SHIKI_LIGHT, ELB_SHIKI_DARK],
      langs: [json, javascript, typescript, tsx, bash, html, css],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighter;
}

function resolveLang(language: string | undefined): string {
  if (!language) return 'json';
  return (LANGS as readonly string[]).includes(language) ? language : 'text';
}

export function CodeStatic({
  code,
  language,
  className,
}: CodeStaticProps): React.ReactElement {
  const rendered = getHighlighterSync().codeToHtml(code, {
    lang: resolveLang(language),
    themes: { light: ELB_THEME_LIGHT, dark: ELB_THEME_DARK },
    defaultColor: 'light',
  });

  const wrapperClass = `elb-code-static${className ? ` ${className}` : ''}`;

  return (
    <div
      className={wrapperClass}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
