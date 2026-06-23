import React from 'react';
import { renderToString } from 'react-dom/server';
import { CodeStatic } from '../components/atoms/code-static';

describe('CodeStatic SSR', () => {
  it('emits highlighted code in server-rendered HTML (no client effect)', () => {
    const html = renderToString(
      <CodeStatic code={`const x = 1;`} language="typescript" />,
    );
    expect(html).toContain('const');
    expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
    // Dual-theme output carries the dark variables for the data-theme switch.
    expect(html).toContain('--shiki-dark');
  });

  it('degrades gracefully for an unknown language and escapes the input', () => {
    const html = renderToString(
      <CodeStatic code={'<stuff>'} language="rust" />,
    );
    expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
    // The raw input must be HTML-escaped, never emitted as a live element.
    // Shiki escapes `<` as the hex entity `&#x3C;`.
    expect(html).not.toContain('<stuff>');
    expect(html).toContain('&#x3C;stuff>');
  });
});
