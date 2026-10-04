import React from 'react';
import { renderToString } from 'react-dom/server';
import { CodeStatic } from '../components/atoms/code-static';
import { CodeView } from '../components/molecules/code-view';

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

  // The docs Markdown export is converted from this HTML and reads a fence's
  // language from the `language-<lang>` class on `<code>`.
  it('names the language on the code element', () => {
    const html = renderToString(
      <CodeStatic code={`const x = 1;`} language="typescript" />,
    );
    expect(html).toMatch(/<code class="language-typescript">/);
  });

  it('names the requested language even when it renders as plain text', () => {
    const html = renderToString(
      <CodeStatic code={'key: value'} language="yaml" />,
    );
    expect(html).toMatch(/<code class="language-yaml">/);
  });

  it('names json when no language is given', () => {
    const html = renderToString(<CodeStatic code={'{}'} />);
    expect(html).toMatch(/<code class="language-json">/);
  });

  it('CodeView passes its language, and each tab its own, to the code', () => {
    expect(renderToString(<CodeView code={'npm i'} language="bash" />)).toMatch(
      /<code class="language-bash">/,
    );
    // Only the active tab renders.
    const tabs = [
      { id: 'a', label: 'A', code: 'a', language: 'tsx' },
      { id: 'b', label: 'B', code: 'b' },
    ];
    expect(
      renderToString(<CodeView language="javascript" tabs={tabs} />),
    ).toMatch(/<code class="language-tsx">/);
    expect(
      renderToString(
        <CodeView language="javascript" tabs={tabs} defaultTab="b" />,
      ),
    ).toMatch(/<code class="language-javascript">/);
  });
});
