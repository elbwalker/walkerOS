import React, { useEffect, useState } from 'react';
import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from 'shiki';

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

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['dark-plus', 'light-plus'],
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
        theme: activeTheme === 'dark' ? 'dark-plus' : 'light-plus',
      });
      setHtml(rendered);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language, activeTheme]);

  return (
    <div
      className={className}
      // eslint-disable-next-line react/no-danger -- Shiki output is safe.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
