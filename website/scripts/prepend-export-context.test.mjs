import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';

const SRC = new URL('../src/remark', import.meta.url).pathname;
const { default: prependExportContext } = await import(
  `${SRC}/prepend-export-context.ts`
);
const { default: normalizeExportLinks } = await import(
  `${SRC}/normalize-export-links.ts`
);

const INDEX = 'https://www.walkeros.io/llms.txt';
const EXPECTED =
  '> Part of the walkerOS documentation. Project overview and full index: <https://www.walkeros.io/llms.txt>';

// Mirrors the export pipeline: remark-gfm is on, the site plugins run after the
// built-ins, then remark-stringify emits the .md file.
function run(
  markdown,
  plugins = [[prependExportContext, { indexUrl: INDEX }]],
) {
  const processor = unified().use(remarkParse).use(remarkGfm);
  for (const p of plugins) {
    if (Array.isArray(p)) processor.use(p[0], p[1]);
    else processor.use(p);
  }
  return String(processor.use(remarkStringify).processSync(markdown));
}

const PAGE = [
  '# Mapping',
  '',
  'Transform events on the way to a destination.',
  '',
  '- [Sources](/docs/sources/.md)',
  '',
  '```js',
  'const a = 1;',
  '```',
].join('\n');

test('exact line, as a blockquote, at the very top', () => {
  const out = run(PAGE);
  assert.equal(out.split('\n')[0], EXPECTED);
});

test('the index URL is emitted unescaped and machine readable', () => {
  const out = run(PAGE);
  assert.doesNotMatch(out, /\\/);
  assert.match(out, /<https:\/\/www\.walkeros\.io\/llms\.txt>/);
});

test('the page keeps its title, prose, list and code block', () => {
  const out = run(PAGE);
  const body = out.slice(out.indexOf('# Mapping'));
  assert.equal(body.trim(), run(PAGE, []).trim());
});

test('the note is added exactly once when the transform runs twice', () => {
  const opts = [prependExportContext, { indexUrl: INDEX }];
  const out = run(PAGE, [opts, opts]);
  assert.equal(out.split(EXPECTED).length - 1, 1);
});

test('re-running over an already prepended export does not duplicate', () => {
  const out = run(run(PAGE));
  assert.equal(out.split(EXPECTED).length - 1, 1);
});

test('composes with normalizeExportLinks: /.md targets still get rewritten', () => {
  const out = run(PAGE, [
    normalizeExportLinks,
    [prependExportContext, { indexUrl: INDEX }],
  ]);
  assert.equal(out.split('\n')[0], EXPECTED);
  assert.match(out, /\(\/docs\/sources\.md\)/);
  assert.doesNotMatch(out, /\/docs\/sources\/\.md/);
});

test('the note itself is left alone by normalizeExportLinks', () => {
  const out = run(PAGE, [
    [prependExportContext, { indexUrl: INDEX }],
    normalizeExportLinks,
  ]);
  assert.equal(out.split('\n')[0], EXPECTED);
});

test('a page with no leading heading still gets the note first', () => {
  const out = run('Just a paragraph.');
  assert.equal(out, `${EXPECTED}\n\nJust a paragraph.\n`);
});

test('a malformed tree is left alone instead of throwing', () => {
  const transform = prependExportContext({ indexUrl: INDEX });
  for (const tree of [null, undefined, 'text', 42, {}, { children: 'no' }]) {
    assert.doesNotThrow(() => transform(tree));
  }
});
