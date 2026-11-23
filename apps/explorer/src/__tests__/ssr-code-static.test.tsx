import React from 'react';
import { renderToString } from 'react-dom/server';
import { render } from '@testing-library/react';
import { syntaxKeyword } from '../design';
import {
  CodeStatic,
  type CodeStaticMark,
} from '../components/atoms/code-static';
import { CodeView } from '../components/molecules/code-view';

describe('CodeStatic SSR', () => {
  it('emits highlighted code in server-rendered HTML (no client effect)', () => {
    const html = renderToString(
      <CodeStatic code={`const x = 1;`} language="typescript" />,
    );
    expect(html).toContain('const');
    expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
    // One dark theme in both page themes: colours inline, from the design
    // constants, with no second theme to switch to.
    expect(html).not.toContain('--shiki-dark');
    expect(html.toLowerCase()).toContain(`color:${syntaxKeyword}`);
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

describe('CodeStatic line marks, line numbers and reveal', () => {
  const CODE = 'const a = 1;\nconst b = 2;\nconst c = 3;';
  const lines = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.line'));
  // The code as shown: line text without the gutter's numbers, glyphs or words.
  const shown = (container: HTMLElement) =>
    lines(container)
      .map((line) =>
        Array.from(line.childNodes)
          .filter(
            (node) =>
              !(node instanceof Element) ||
              !node.className.startsWith('elb-code-static__'),
          )
          .map((node) => node.textContent)
          .join(''),
      )
      .join('\n');

  it.each<CodeStaticMark['kind']>(['add', 'focus'])(
    'a %s mark marks its line only',
    (kind) => {
      const { container } = render(
        <CodeStatic
          code={CODE}
          language="javascript"
          marks={[{ line: 2, kind }]}
        />,
      );
      expect(
        lines(container).map((line) => line.getAttribute('data-mark')),
      ).toEqual([null, kind, null]);
      expect(shown(container)).toBe(CODE);
    },
  );

  it('ignores a mark beyond the last line', () => {
    const { container } = render(
      <CodeStatic
        code={CODE}
        language="javascript"
        marks={[{ line: 9, kind: 'add' }]}
      />,
    );
    expect(container.querySelectorAll('[data-mark]')).toHaveLength(0);
    expect(shown(container)).toBe(CODE);
  });

  it('numbers the lines from 1', () => {
    const { container } = render(
      <CodeStatic code={CODE} language="javascript" lineNumbers />,
    );
    expect(
      Array.from(
        container.querySelectorAll('.elb-code-static__number'),
        (number) => number.textContent,
      ),
    ).toEqual(['1', '2', '3']);
    expect(shown(container)).toBe(CODE);
  });

  it.each([
    ['5 characters, a caret after them', 5, 'const', 1],
    ['into the second line', 16, 'const a = 1;\ncon', 1],
    ['the whole code, no caret', CODE.length, CODE, 0],
  ])('reveal: %s', (_name, reveal, text, carets) => {
    const { container } = render(
      <CodeStatic code={CODE} language="javascript" reveal={reveal} />,
    );
    expect(shown(container)).toBe(text);
    expect(container.querySelectorAll('.elb-code-static__caret')).toHaveLength(
      carets,
    );
  });

  it.each([
    [
      'line 2 to 5 characters: the rest in full, one caret',
      { line: 2, chars: 5 },
      'const a = 1;\nconst\nconst c = 3;',
      1,
    ],
    ['a line beyond the last: ignored', { line: 9, chars: 3 }, CODE, 0],
  ])('typing: %s', (_name, typing, text, carets) => {
    const { container } = render(
      <CodeStatic code={CODE} language="javascript" typing={typing} />,
    );
    expect(shown(container)).toBe(text);
    expect(container.querySelectorAll('.elb-code-static__caret')).toHaveLength(
      carets,
    );
  });

  it('keeps the colours of the whole code while revealing', () => {
    const color = (container: HTMLElement) =>
      container.querySelector('.line span')?.getAttribute('style');
    const full = render(<CodeStatic code={CODE} language="javascript" />);
    const typed = render(
      <CodeStatic code={CODE} language="javascript" reveal={3} />,
    );
    expect(color(typed.container)).toBe(color(full.container));
  });
});
