import React, { useEffect, useState } from 'react';
import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from 'shiki';
import { palenightTheme } from '../../themes/palenight';
import { lighthouseTheme } from '../../themes/lighthouse';
import { monacoThemeToShiki } from '../../themes/shiki-adapter';
import { ELB_THEME_DARK, ELB_THEME_LIGHT } from '../../themes/names';

export interface CodeStaticProps {
  code: string;
  language?: string;
  className?: string;
  /** Force theme. If omitted, auto-detected from <html> data-theme / class. */
  theme?: 'light' | 'dark';
}

// Pinned language set. Extend here when docs need a new language.
const LANGS: readonly BundledLanguage[] = [
  'json',
  'javascript',
  'typescript',
  'tsx',
  'jsx',
  'bash',
  'html',
  'css',
  'markdown',
];

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

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [ELB_SHIKI_LIGHT, ELB_SHIKI_DARK],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

function detectTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  const html = document.documentElement;
  if (html.dataset.theme === 'dark') return 'dark';
  if (html.classList.contains('dark')) return 'dark';
  return 'light';
}

function resolveLang(language: string | undefined): BundledLanguage | 'text' {
  if (!language) return 'json';
  return (LANGS as readonly string[]).includes(language)
    ? (language as BundledLanguage)
    : 'text';
}

export function CodeStatic({
  code,
  language,
  className,
  theme,
}: CodeStaticProps): React.ReactElement {
  const [html, setHtml] = useState<string>('');
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>(
    theme ?? detectTheme(),
  );

  // Track host theme changes when not explicitly overridden.
  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
      return;
    }
    setActiveTheme(detectTheme());
    const observer = new MutationObserver(() => setActiveTheme(detectTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      const rendered = highlighter.codeToHtml(code, {
        lang: resolveLang(language),
        theme: activeTheme === 'dark' ? ELB_THEME_DARK : ELB_THEME_LIGHT,
      });
      setHtml(rendered);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language, activeTheme]);

  const wrapperClass = `elb-code-static${className ? ` ${className}` : ''}`;

  return (
    <div className={wrapperClass} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
