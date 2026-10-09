// Stub the Vite virtual module before any import of code.tsx.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

// Server rendering never runs the editors; the roots around them are what
// these tests read.
jest.mock('@monaco-editor/react', () => ({
  Editor: () => null,
  DiffEditor: () => null,
  useMonaco: () => null,
  loader: { config: () => {}, init: () => Promise.resolve() },
}));

import React from 'react';
import { renderToString } from 'react-dom/server';
import { eventAction, eventEntity, vizBg, vizFg } from '../../design';
import { Code } from '../atoms/code';
import { CodeDiff } from '../atoms/code-diff';
import { CodeStatic } from '../atoms/code-static';
import { CodeBox } from '../molecules/code-box';
import { CodeView } from '../molecules/code-view';
import { Preview, previewStyles } from '../molecules/preview';
import { previewDesignCss } from '../../design/preview-css';

function outermost(element: React.ReactElement): Element | null {
  const host = document.createElement('div');
  host.innerHTML = renderToString(element);
  return host.firstElementChild;
}

// Code surfaces are dark in both themes: each component's own root carries
// the theme, so it needs no ancestor to set it.
it.each<[string, React.ReactElement]>([
  ['CodeBox', <CodeBox key="code-box" code="{}" language="json" />],
  ['Code', <Code key="code" code="{}" language="json" />],
  ['CodeDiff', <CodeDiff key="code-diff" original="{}" modified="{}" />],
  ['CodeView', <CodeView key="code-view" code="{}" language="json" />],
  ['CodeStatic', <CodeStatic key="code-static" code="{}" language="json" />],
  ['Preview', <Preview key="preview" html="<p>Hello</p>" />],
])('%s renders as a dark island', (_, element) => {
  expect(outermost(element)?.getAttribute('data-theme')).toBe('dark');
});

describe('Preview document', () => {
  it('paints the visualisation ground', () => {
    const styles = previewStyles('');

    expect(styles).toContain(`background: ${vizBg};`);
    expect(styles).toContain(`color: ${vizFg};`);
  });

  it('edges every highlight ring with the visualisation ground', () => {
    const styles = previewStyles('');

    expect(styles).toContain(
      `box-shadow: 0 0 0 2px ${eventEntity.dark}, 0 0 0 3px ${vizBg};`,
    );
    expect(styles).toContain(
      `box-shadow: 0 0 0 2px ${eventAction.dark}, 0 0 0 3px ${vizBg}, 0 0 0 5px ${eventEntity.dark}, 0 0 0 6px ${vizBg};`,
    );
  });

  it('carries the design CSS ahead of the page CSS, its layers above the reset', () => {
    const styles = previewStyles('.card { padding: 4px; }');

    expect(styles.indexOf('@layer reset, base, components;')).toBeLessThan(
      styles.indexOf(previewDesignCss),
    );
    expect(styles.indexOf(previewDesignCss)).toBeLessThan(
      styles.indexOf('.card { padding: 4px; }'),
    );
  });

  it('lets the page CSS follow the ground it paints', () => {
    const styles = previewStyles('.card { padding: 4px; }');

    expect(styles.indexOf('.card { padding: 4px; }')).toBeGreaterThan(
      styles.indexOf(`background: ${vizBg};`),
    );
  });
});
