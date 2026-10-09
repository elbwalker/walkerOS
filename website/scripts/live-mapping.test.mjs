import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VFile } from 'vfile';
import remarkGfm from 'remark-gfm';
import { compile, run } from '@mdx-js/mdx';
import * as jsxRuntime from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// The mapping value page runs every LiveCode example in the reader's browser.
// This compiles the page, takes each example the way LiveCode receives it,
// runs it through the page's own harness (real core, real collector) and
// compares what it logs with the result the page shows.
const WEBSITE = new URL('..', import.meta.url).pathname;
const PAGE = join(WEBSITE, 'docs/mapping/value.mdx');

/** The page's LiveCode examples, as props, and the module's exports. */
async function examples() {
  const compiled = await compile(
    new VFile({ path: PAGE, value: readFileSync(PAGE, 'utf8') }),
    { outputFormat: 'function-body', remarkPlugins: [remarkGfm] },
  );
  const page = await run(String(compiled), {
    ...jsxRuntime,
    baseUrl: import.meta.url,
  });
  const live = [];
  renderToStaticMarkup(
    React.createElement(page.default, {
      components: {
        LiveCode: (props) => {
          live.push(props);
          return null;
        },
        CodeSnippet: () => null,
      },
    }),
  );
  return { live, page };
}

/** A prop as LiveCode hands it to `fn`: a string trimmed, anything else as JSON. */
const asText = (value) =>
  value === undefined
    ? ''
    : typeof value === 'string'
      ? value.trim()
      : JSON.stringify(value, null, 2);

/** The value a shown result stands for: the page writes it as a JS literal. */
const shownValue = (output) => new Function(`return (${output});`)();

test('every live mapping example logs the result its page shows', async () => {
  const { live, page } = await examples();
  assert.ok(live.length >= 8, `${live.length} live examples on the page`);

  for (const example of live) {
    const logged = [];
    await example.fn(asText(example.input), asText(example.config), (...args) =>
      logged.push(...args),
    );
    assert.equal(logged.length, 1, `one result for:\n${example.input}`);
    const expected =
      example.output === undefined ? undefined : shownValue(example.output);
    assert.deepEqual(logged[0], expected, example.input);
  }

  const { collector } = await page.flow.started;
  await collector.command('shutdown');
});
