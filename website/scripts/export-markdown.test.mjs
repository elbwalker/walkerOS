import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile, run } from '@mdx-js/mdx';
import { VFile } from 'vfile';
import * as jsxRuntime from 'react/jsx-runtime';
import React from 'react';
import { renderToString } from 'react-dom/server';

// The docs Markdown export (llms-txt plugin) converts each page's server
// render, so these tests run real explorer components through the plugin's own
// HTML-to-Markdown conversion. Run with tsx: the sources are TypeScript.
const WEBSITE = new URL('..', import.meta.url).pathname;
const ROOT = join(WEBSITE, '..');

const { default: exportDropComments } = await import(
  `${WEBSITE}src/rehype/export-drop-comments.ts`
);
const { default: exportFlowSnippets } = await import(
  `${WEBSITE}src/rehype/export-flow-snippets.ts`
);
const { CodeView } = await import(
  `${ROOT}/apps/explorer/src/components/molecules/code-view.tsx`
);
const { CodeSnippet } = await import(
  `${ROOT}/apps/explorer/src/components/molecules/code-snippet.tsx`
);
const { CodeStatic } = await import(
  `${ROOT}/apps/explorer/src/components/atoms/code-static.tsx`
);
const { convertHtmlToMarkdown } = await import(
  `${ROOT}/node_modules/@signalwire/docusaurus-plugin-llms-txt/lib/transformation/html-parser.js`
);

function toMarkdown(
  bodyHtml,
  rehypePlugins = [exportDropComments, exportFlowSnippets],
) {
  const html = `<html><head><title>T</title></head><body><main><article><div class="theme-doc-markdown markdown">${bodyHtml}</div></article></main></body></html>`;
  return convertHtmlToMarkdown(
    html,
    {
      rehypeProcessLinks: false,
      remarkGfm: true,
      beforeDefaultRehypePlugins: rehypePlugins,
    },
    ['.theme-doc-markdown'],
  ).content;
}

const render = (type, props) =>
  renderToString(React.createElement(type, props));

describe('export: explorer code blocks keep their language', () => {
  test('CodeSnippet, CodeView and CodeStatic export fences with the requested language', () => {
    const md = toMarkdown(
      [
        render(CodeSnippet, {
          code: 'npm install @walkeros/core',
          language: 'bash',
        }),
        // Not in Shiki's pinned set: renders as plain text, still fenced as yaml.
        render(CodeView, {
          code: 'port: 8080',
          language: 'yaml',
          label: 'Config',
        }),
        // CodeView defaults to javascript, CodeStatic to json.
        render(CodeView, { code: 'elb("page view");' }),
        render(CodeStatic, { code: '{ "a": 1 }' }),
      ].join(''),
    );
    assert.ok(md.includes('```bash\nnpm install @walkeros/core\n```'), md);
    assert.ok(md.includes('```yaml\nport: 8080\n```'), md);
    assert.ok(md.includes('```javascript\nelb("page view");\n```'), md);
    assert.ok(md.includes('```json\n{ "a": 1 }\n```'), md);
    const openers = (md.match(/^```.*$/gm) ?? []).filter((_, i) => i % 2 === 0);
    assert.equal(openers.length, 4);
    for (const opener of openers)
      assert.notEqual(opener, '```', 'fence without language');
  });

  test('the language class on code is what carries it', () => {
    const html = render(CodeSnippet, { code: 'ls', language: 'bash' });
    assert.match(html, /<code class="language-bash">/);
    const md = toMarkdown(html.replace(' class="language-bash"', ''));
    assert.ok(md.includes('```\nls\n```'), md);
  });
});

describe('export: React text separators', () => {
  // Same shape as website/src/components/snippets/_configuration.mdx.
  const SOURCE =
    'This {props.type} uses the standard {props.type} config wrapper.\n';

  async function renderMdx(props) {
    const compiled = await compile(
      new VFile({ path: 'snippet.mdx', value: SOURCE }),
      {
        outputFormat: 'function-body',
      },
    );
    const { default: Content } = await run(String(compiled), {
      ...jsxRuntime,
      baseUrl: import.meta.url,
    });
    return renderToString(React.createElement(Content, props));
  }

  test('server render separates prop text with comments, which the export drops', async () => {
    const html = await renderMdx({ type: 'destination' });
    assert.match(
      html,
      /This <!-- -->destination<!-- --> uses/,
      'fixture reproduces the separator',
    );
    const md = toMarkdown(html);
    assert.ok(
      md.includes(
        'This destination uses the standard destination config wrapper.',
      ),
      md,
    );
    assert.doesNotMatch(md, /<!--/);
  });

  test('without exportDropComments the comments reach the Markdown', async () => {
    const md = toMarkdown(await renderMdx({ type: 'destination' }), [
      exportFlowSnippets,
    ]);
    assert.match(md, /<!-- -->/);
  });

  test('comments are dropped at any depth, text around them stays', () => {
    const md = toMarkdown(
      '<ul><li><p>a<!-- x -->b <strong>c<!-- -->d</strong></p></li></ul><!-- top -->',
    );
    assert.doesNotMatch(md, /<!--/);
    assert.ok(md.includes('* ab **cd**'), md);
  });

  test('docusaurus.config registers it before exportFlowSnippets', () => {
    const source = readFileSync(join(WEBSITE, 'docusaurus.config.ts'), 'utf8');
    assert.match(
      source,
      /beforeDefaultRehypePlugins:\s*\[exportDropComments, exportFlowSnippets\]/,
    );
  });
});
