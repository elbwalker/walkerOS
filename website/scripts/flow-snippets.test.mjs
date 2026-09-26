import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { VFile } from 'vfile';
import { compile, run } from '@mdx-js/mdx';
import * as jsxRuntime from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';

const createJiti = createRequire(import.meta.url)('jiti');

// Run with tsx: the plugins and the manifest use extensionless imports.
const WEBSITE = new URL('..', import.meta.url).pathname;
const ROOT = join(WEBSITE, '..');
const FIXTURES = join(WEBSITE, 'scripts/fixtures/flow-snippets');
const FLOW_FILE = join(ROOT, 'packages/cli/examples/flow-complete.json');

const { default: flowSnippets } = await import(
  `${WEBSITE}src/remark/flow-snippets.ts`
);
const { default: exportFlowSnippets } = await import(
  `${WEBSITE}src/rehype/export-flow-snippets.ts`
);
const { default: normalizeExportLinks } = await import(
  `${WEBSITE}src/remark/normalize-export-links.ts`
);
const { default: prependExportContext } = await import(
  `${WEBSITE}src/remark/prepend-export-context.ts`
);
const { flowCompleteFeatures, resolvePointer } = await import(
  `${ROOT}/packages/cli/src/examples/flow-complete.manifest.ts`
);
const { findStepExample, guideChapterUrl } = await import(
  `${WEBSITE}src/components/snippets/flow-complete.ts`
);
const { convertHtmlToMarkdown } = await import(
  `${ROOT}/node_modules/@signalwire/docusaurus-plugin-llms-txt/lib/transformation/html-parser.js`
);

const FLOW = JSON.parse(readFileSync(FLOW_FILE, 'utf8'));

function entry(id) {
  const found = flowCompleteFeatures.find((feature) => feature.id === id);
  assert.ok(found, `fixture uses unknown feature ${id}`);
  return found;
}

// Independent oracle: the render() of the deleted FlowSlice.tsx, verbatim.
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function oracle(value, depth = Infinity, indent = '') {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (depth === 0) return '[ … ]';
    const items = value.map((item) => inner + oracle(item, depth - 1, inner));
    return `[\n${items.join(',\n')}\n${indent}]`;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    if (depth === 0) return '{ … }';
    const items = entries.map(
      ([key, item]) =>
        `${inner}${JSON.stringify(key)}: ${
          key === 'examples' && isRecord(item)
            ? '{ … }'
            : oracle(item, depth - 1, inner)
        }`,
    );
    return `{\n${items.join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

// Docs pipeline, tree level: MDX parse plus directives (Docusaurus admonitions).
function transform(source, { path = 'docs/fixture.mdx', flowFile = FLOW_FILE } = {}) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(flowSnippets, { flowFile });
  const file = new VFile({ path, value: source });
  return processor.runSync(processor.parse(file), file);
}

function walk(node, fn, parent) {
  fn(node, parent);
  for (const child of node.children ?? []) walk(child, fn, node);
}
function findAll(tree, predicate) {
  const out = [];
  walk(tree, (node, parent) => {
    if (predicate(node)) out.push({ node, parent });
  });
  return out;
}
const isJsx = (name) => (node) =>
  (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
  node.name === name;
function attr(node, name) {
  return node.attributes.find((a) => a.name === name);
}
function attrValue(node, name) {
  return attr(node, name)?.value;
}
function mdastText(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return (node.children ?? []).map(mdastText).join('');
}

function throwsAt(source, line, pattern, options) {
  assert.throws(
    () => transform(source, options),
    (error) => {
      assert.ok(error instanceof Error, 'throws an Error');
      assert.match(error.message, /^flow-snippets: /);
      assert.match(
        error.message,
        new RegExp(`fixture\\.mdx:${line}\\b`),
        `message names file and line ${line}: ${error.message}`,
      );
      assert.match(error.message, pattern);
      return true;
    },
  );
}

describe('docs transform: node shapes', () => {
  test('object slice becomes figure > CodeView + figcaption with the rendered code', () => {
    const tree = transform('<FlowSlice feature="cmp-category-map" />\n');
    const [figure] = findAll(tree, isJsx('figure'));
    assert.ok(figure, 'a figure is emitted');
    assert.equal(figure.node.type, 'mdxJsxFlowElement');
    assert.equal(attrValue(figure.node, 'className'), 'flow-slice');
    assert.equal(attrValue(figure.node, 'data-export-lang'), 'json');
    const [code, caption] = figure.node.children;
    assert.equal(code.name, 'CodeView');
    const e = entry('cmp-category-map');
    assert.equal(attrValue(code, 'label'), e.pointer);
    assert.equal(attrValue(code, 'language'), 'json');
    assert.equal(
      attrValue(code, 'code'),
      oracle(resolvePointer(FLOW, e.pointer)),
    );
    assert.equal(attr(code, 'height'), undefined, 'short slice: no height');
    assert.equal(caption.name, 'figcaption');
    const link = caption.children.find((c) => c.type === 'link');
    assert.equal(link.url, guideChapterUrl(e.chapter));
    assert.equal(mdastText(link), `Guide chapter ${e.chapter}`);
    assert.ok(link.children.some((c) => c.type === 'inlineCode' && c.value === e.chapter));
    assert.ok(mdastText(caption).startsWith(`${e.note} `));
    assert.equal(findAll(tree, isJsx('FlowSlice')).length, 0);
  });

  test('a slice over 30 lines gets height 480px; string, not expression', () => {
    const tree = transform('<FlowSlice feature="flow-sources" />\n');
    const [code] = findAll(tree, isJsx('CodeView'));
    const height = attr(code.node, 'height');
    assert.ok(height, 'height set');
    assert.equal(height.value, '480px');
  });

  test('exactly 30 lines is not tall, 31 is (boundary against the oracle)', () => {
    // Every object feature: height present iff oracle lines > 30.
    for (const e of flowCompleteFeatures) {
      const value = resolvePointer(FLOW, e.pointer);
      if (!isRecord(value) && !Array.isArray(value)) continue;
      const tree = transform(`<FlowSlice feature="${e.id}" />\n`);
      const [code] = findAll(tree, isJsx('CodeView'));
      const lines = oracle(value).split('\n').length;
      assert.equal(
        attr(code.node, 'height') !== undefined,
        lines > 30,
        `${e.id}: ${lines} lines`,
      );
      assert.equal(attrValue(code.node, 'code'), oracle(value), e.id);
    }
  });

  test('depth={1} collapses nested branches like the old render', () => {
    const e = entry('step-examples');
    const tree = transform('<FlowSlice feature="step-examples" depth={1} />\n');
    const [code] = findAll(tree, isJsx('CodeView'));
    assert.equal(attrValue(code.node, 'code'), oracle(resolvePointer(FLOW, e.pointer), 1));
    assert.match(attrValue(code.node, 'code'), /\{ … \}/);
  });

  test('depth={0} is allowed and collapses the root', () => {
    const tree = transform('<FlowSlice feature="cmp-category-map" depth={0} />\n');
    const [code] = findAll(tree, isJsx('CodeView'));
    assert.equal(attrValue(code.node, 'code'), '{ … }');
  });

  test('an array slice renders as a figure too', () => {
    const e = entry('express-paths');
    const value = resolvePointer(FLOW, e.pointer);
    assert.ok(Array.isArray(value), 'fixture assumption: array');
    const tree = transform('<FlowSlice feature="express-paths" />\n');
    const [code] = findAll(tree, isJsx('CodeView'));
    assert.equal(attrValue(code.node, 'code'), oracle(value));
  });

  for (const id of ['express-port', 'browser-pageview', 'platform']) {
    test(`scalar slice ${id} becomes a plain paragraph, no JSX`, () => {
      const e = entry(id);
      const value = resolvePointer(FLOW, e.pointer);
      const tree = transform(`<FlowSlice feature="${id}" />\n`);
      assert.equal(tree.children.length, 1);
      const [paragraph] = tree.children;
      assert.equal(paragraph.type, 'paragraph');
      const [pointer, colon, json] = paragraph.children;
      assert.deepEqual(
        [pointer.type, pointer.value],
        ['inlineCode', e.pointer],
      );
      assert.equal(colon.value, ': ');
      assert.deepEqual([json.type, json.value], ['inlineCode', JSON.stringify(value)]);
      assert.equal(findAll(tree, (n) => n.type?.startsWith('mdxJsx')).length, 0);
      const link = paragraph.children.find((c) => c.type === 'link');
      assert.equal(link.url, guideChapterUrl(e.chapter));
      assert.ok(mdastText(paragraph).includes(e.note));
    });
  }

  test('RFC 6901: ~1 in a real pointer (@walkeros/collector) resolves', () => {
    const e = entry('package-version');
    assert.match(e.pointer, /~1/);
    const tree = transform('<FlowSlice feature="package-version" />\n');
    const [paragraph] = tree.children;
    assert.equal(paragraph.children[0].value, e.pointer, 'caption keeps the escaped pointer');
    assert.equal(
      paragraph.children[2].value,
      JSON.stringify(FLOW.flows.server.config.bundle.packages['@walkeros/collector'].version),
    );
  });

  test('RFC 6901: a literal "~1" key must not satisfy the pointer', () => {
    const e = entry('package-version');
    const flow = structuredClone(FLOW);
    const packages = flow.flows.server.config.bundle.packages;
    packages['@walkeros~1collector'] = packages['@walkeros/collector'];
    delete packages['@walkeros/collector'];
    const flowFile = flowFileOf('tilde-literal', flow);
    throwsAt('\n<FlowSlice feature="package-version" />\n', 2, /does not resolve/, {
      flowFile,
    });
    assert.ok(e);
  });

  test('FlowExample emits figure > StepExample with an estree-backed example prop', () => {
    const e = entry('ga4-purchase');
    const expected = findStepExample(FLOW, e.pointer, e.example);
    const tree = transform('<FlowExample feature="ga4-purchase" />\n');
    const [figure] = findAll(tree, isJsx('figure'));
    assert.equal(attrValue(figure.node, 'className'), 'flow-example');
    assert.equal(attrValue(figure.node, 'data-export-lang'), 'json,json,javascript');
    const [step] = findAll(tree, isJsx('StepExample'));
    const example = attr(step.node, 'example');
    assert.equal(example.value.type, 'mdxJsxAttributeValueExpression');
    const estree = example.value.data?.estree;
    assert.ok(estree, 'data.estree present');
    assert.equal(estree.body[0].expression.type, 'ObjectExpression');
    assert.deepEqual(JSON.parse(example.value.value), {
      title: expected.title,
      ...(typeof expected.description === 'string' ? { description: expected.description } : {}),
      in: expected.in,
      mapping: expected.mapping,
      out: expected.out,
    });
    const caption = figure.node.children.find((c) => c.name === 'figcaption');
    const text = mdastText(caption);
    assert.ok(text.startsWith(`${expected.title}: example ${e.example.name} of step ${e.example.step}. `), text);
    assert.equal(caption.children.find((c) => c.type === 'link').url, guideChapterUrl(e.chapter));
  });

  test('FlowExample without mapping lists two languages', () => {
    const tree = transform('<FlowExample feature="collect-api" />\n');
    const [figure] = findAll(tree, isJsx('figure'));
    assert.equal(attrValue(figure.node, 'data-export-lang'), 'json,javascript');
  });

  test('FlowExample whose example has no out: key omitted, lang list still matches StepExample', () => {
    const e = entry('session-source');
    const expected = findStepExample(FLOW, e.pointer, e.example);
    assert.equal(expected.out, undefined, 'fixture assumption: no out');
    const tree = transform('<FlowExample feature="session-source" />\n');
    const [step] = findAll(tree, isJsx('StepExample'));
    const parsed = JSON.parse(attr(step.node, 'example').value.value);
    assert.equal('out' in parsed, false);
    const [figure] = findAll(tree, isJsx('figure'));
    // StepExample always renders an Out CodeView, so two blocks.
    assert.equal(attrValue(figure.node, 'data-export-lang').split(',').length, 2);
  });

  test('several tags on one page are all replaced, in order', () => {
    const tree = transform(
      readFileSync(join(FIXTURES, 'many.mdx'), 'utf8'),
    );
    assert.equal(findAll(tree, isJsx('FlowSlice')).length, 0);
    assert.equal(findAll(tree, isJsx('FlowExample')).length, 0);
    const labels = findAll(tree, isJsx('CodeView')).map((c) => attrValue(c.node, 'label'));
    assert.deepEqual(labels, [
      entry('cmp-category-map').pointer,
      entry('flow-sources').pointer,
      entry('express-paths').pointer,
    ]);
    assert.equal(findAll(tree, isJsx('StepExample')).length, 2);
  });

  test('tags inside a list item, an admonition and a JSX container are replaced', () => {
    const tree = transform(readFileSync(join(FIXTURES, 'nested.mdx'), 'utf8'));
    assert.equal(findAll(tree, isJsx('FlowSlice')).length, 0);
    assert.equal(findAll(tree, isJsx('FlowExample')).length, 0);
    const figures = findAll(tree, isJsx('figure'));
    assert.deepEqual(
      figures.map((f) => f.parent.type + ':' + (f.parent.name ?? '')),
      ['listItem:', 'containerDirective:note', 'mdxJsxFlowElement:TabItem'],
    );
  });
});

describe('docs transform: failures name file and line', () => {
  test('unknown id', () =>
    throwsAt('# Page\n\n<FlowSlice feature="no-such-feature" />\n', 3, /no-such-feature/));
  test('unknown id in FlowExample', () =>
    throwsAt('\n\n\n<FlowExample feature="nope" />\n', 4, /FlowExample.*nope/));
  test('pointer that does not resolve', () => {
    const flowFile = flowFileOf('empty', { version: 4, flows: {} });
    throwsAt('<FlowSlice feature="cmp-category-map" />\n', 1, /does not resolve/, { flowFile });
  });
  test('example that does not resolve', () => {
    const flowFile = flowFileOf('empty', { version: 4, flows: {} });
    throwsAt('text\n\n<FlowExample feature="ga4-purchase" />\n', 3, /not found|does not resolve/, { flowFile });
  });
  test('FlowExample on a feature with no example', () =>
    throwsAt('<FlowExample feature="schema-url" />\n', 1, /schema-url.*no example|no example/));
  test('missing feature', () => throwsAt('<FlowSlice />\n', 1, /feature/));
  test('single-quoted feature (only double quotes match the drift gate)', () =>
    throwsAt("text\n\n<FlowSlice feature='cmp-category-map' />\n", 3, /quot/));
  test('single-quoted feature on FlowExample', () =>
    throwsAt("<FlowExample feature='ga4-purchase' />\n", 1, /quot/));
  test('empty feature', () => throwsAt('<FlowSlice feature="" />\n', 1, /feature/));
  test('boolean feature attribute', () => throwsAt('<FlowSlice feature />\n', 1, /feature/));
  test('expression feature', () =>
    throwsAt('<FlowSlice feature={"cmp-category-map"} />\n', 1, /feature/));
  test('string depth', () =>
    throwsAt('<FlowSlice feature="cmp-category-map" depth="1" />\n', 1, /depth/));
  test('negative depth', () =>
    throwsAt('<FlowSlice feature="cmp-category-map" depth={-1} />\n', 1, /depth/));
  test('fractional depth', () =>
    throwsAt('<FlowSlice feature="cmp-category-map" depth={1.5} />\n', 1, /depth/));
  test('identifier depth', () =>
    throwsAt('<FlowSlice feature="cmp-category-map" depth={x} />\n', 1, /depth/));
  test('depth on FlowExample', () =>
    throwsAt('<FlowExample feature="ga4-purchase" depth={1} />\n', 1, /depth/));
  test('unknown attribute', () =>
    throwsAt('<FlowSlice feature="cmp-category-map" title="x" />\n', 1, /title/));
  test('spread attribute', () =>
    throwsAt('<FlowSlice feature="cmp-category-map" {...props} />\n', 1, /spread/));
  test('duplicate feature attribute', () =>
    throwsAt('<FlowSlice feature="cmp-category-map" feature="flow-sources" />\n', 1, /feature|duplicate/));
  test('children', () =>
    throwsAt('<FlowSlice feature="cmp-category-map">\n  x\n</FlowSlice>\n', 1, /children/));
  test('inline usage', () =>
    throwsAt('Some text\nsee <FlowSlice feature="cmp-category-map" /> here\n', 2, /inline|FlowSlice/));
  test('inline FlowExample', () =>
    throwsAt('A <FlowExample feature="ga4-purchase" /> b\n', 1, /FlowExample/));
  test('missing flowFile option throws at attach', () => {
    assert.throws(() =>
      unified().use(remarkParse).use(remarkMdx).use(flowSnippets, {}).runSync(
        unified().use(remarkParse).use(remarkMdx).parse('x'),
      ),
    );
  });
});

// Synthetic flow files live in a temp dir, derived from the real file, so they never go stale.
const TMP = mkdtempSync(join(tmpdir(), 'flow-snippets-'));
function flowFileOf(name, flow) {
  const path = join(TMP, `${name}.json`);
  writeFileSync(path, JSON.stringify(flow));
  return path;
}

// Stubs with the explorer SSR DOM shape (box.tsx, code-static.tsx, grid).
function CodeView({ label, code, language, height }) {
  assert.equal(typeof code, 'string', `CodeView ${label}: code is a string`);
  assert.equal(typeof language, 'string');
  const lines = code.split('\n').map((line, i) =>
    React.createElement('span', { className: 'line', key: i }, React.createElement('span', { style: { color: '#000' } }, line)),
  );
  const withBreaks = lines.flatMap((line, i) => (i === 0 ? [line] : ['\n', line]));
  return React.createElement(
    'div',
    { className: 'elb-explorer elb-explorer-box', style: height ? { height } : undefined },
    label &&
      React.createElement(
        'div',
        { className: 'elb-explorer-header' },
        React.createElement('span', { className: 'elb-explorer-label' }, label),
        React.createElement('div', null, React.createElement('button', { className: 'elb-explorer-btn', title: 'Copy to clipboard' }, React.createElement('svg'))),
      ),
    React.createElement(
      'div',
      { className: 'elb-explorer-content' },
      React.createElement(
        'div',
        { className: 'elb-code-static' },
        React.createElement('pre', { className: 'shiki shiki-themes elbTheme-light elbTheme-dark', tabIndex: 0 }, React.createElement('code', null, ...withBreaks)),
      ),
    ),
  );
}
// Mirrors StepExample.tsx DOM order; asserts the prop arrived.
function StepExample({ example }) {
  assert.ok(isRecord(example), 'StepExample.example is an object, not undefined');
  assert.ok('in' in example, 'example.in present');
  const out = Array.isArray(example.out)
    ? { code: example.out.map((call) => `${call[0]}(${call.slice(1).map((a) => JSON.stringify(a)).join(', ')});`).join('\n'), language: 'javascript' }
    : { code: String(JSON.stringify(example.out, null, 2)), language: 'json' };
  return React.createElement(
    React.Fragment,
    null,
    example.description && React.createElement('p', { className: 'step-example-description' }, example.description),
    React.createElement(
      'div',
      { className: 'elb-explorer elb-explorer-grid-wrapper' },
      React.createElement(CodeView, { label: 'Event', code: JSON.stringify(example.in, null, 2), language: 'json' }),
      example.mapping !== undefined && React.createElement(CodeView, { label: 'Mapping', code: JSON.stringify(example.mapping, null, 2), language: 'json' }),
      React.createElement(CodeView, { label: 'Out', code: out.code, language: out.language }),
    ),
  );
}

let lastProps = [];
async function compileAndRender(source) {
  const compiled = await compile(new VFile({ path: 'docs/fixture.mdx', value: source }), {
    outputFormat: 'function-body',
    remarkPlugins: [remarkGfm, remarkDirective, [flowSnippets, { flowFile: FLOW_FILE }]],
  });
  const code = String(compiled);
  const { default: Content } = await run(code, { ...jsxRuntime, baseUrl: import.meta.url });
  lastProps = [];
  const Spy = (props) => {
    lastProps.push(props.example);
    return StepExample(props);
  };
  const html = renderToStaticMarkup(
    React.createElement(Content, { components: { CodeView, StepExample: Spy } }),
  );
  return { code, html };
}

const PAGE = readFileSync(join(FIXTURES, 'many.mdx'), 'utf8');

describe('docs transform: real @mdx-js/mdx compile', () => {
  test('compiles to CodeView and StepExample, no FlowSlice/FlowExample reference', async () => {
    const { code } = await compileAndRender(PAGE);
    assert.match(code, /CodeView/);
    assert.match(code, /StepExample/);
    assert.match(code, /example: \{/);
    assert.doesNotMatch(code, /FlowSlice|FlowExample/);
    assert.doesNotMatch(code, /_missingMdxReference\("(FlowSlice|FlowExample)"/);
  });

  test('FlowExample example prop arrives defined and equal to the step example', async () => {
    await compileAndRender(PAGE);
    assert.equal(lastProps.length, 2);
    const e = entry('ga4-purchase');
    const expected = findStepExample(FLOW, e.pointer, e.example);
    assert.deepEqual(lastProps[0].in, expected.in);
    assert.deepEqual(lastProps[0].mapping, expected.mapping);
    assert.deepEqual(lastProps[0].out, expected.out);
    assert.equal(lastProps[0].title, expected.title);
  });

  test('null, quotes, backslashes, </script>, unicode, numbers survive jsonToEstree', async () => {
    const e = entry('ga4-purchase');
    const flow = structuredClone(FLOW);
    const example = findStepExample(flow, e.pointer, e.example);
    const weird = {
      a: null,
      'b"c': 'x\\y</script>${1}`',
      'd-e': [1, -2.5, 0, 1e21, true, false, null, {}, [], ''],
      '__proto__x': { nested: { deep: ['\u2028', 'ü', '{ … }'] } },
    };
    example.in = weird;
    const flowFile = flowFileOf('weird', flow);
    const compiled = await compile(`<FlowExample feature="${e.id}" />\n`, {
      outputFormat: 'function-body',
      remarkPlugins: [[flowSnippets, { flowFile }]],
    });
    const { default: Content } = await run(String(compiled), { ...jsxRuntime, baseUrl: import.meta.url });
    let seen;
    renderToStaticMarkup(
      React.createElement(Content, { components: { CodeView, StepExample: (p) => { seen = p.example; return null; } } }),
    );
    assert.deepEqual(seen.in, weird);
  });

  test('every real example reaches StepExample intact', async () => {
    // Every real example round-trips through compile + run unchanged.
    for (const e of flowCompleteFeatures.filter((f) => f.example)) {
      const expected = findStepExample(FLOW, e.pointer, e.example);
      await compileAndRender(`<FlowExample feature="${e.id}" />\n`);
      assert.equal(lastProps.length, 1, e.id);
      assert.deepEqual(lastProps[0].in, expected.in, e.id);
      assert.deepEqual(lastProps[0].mapping, expected.mapping, e.id);
      assert.deepEqual(lastProps[0].out, expected.out, e.id);
    }
  });
});

function toMarkdown(bodyHtml) {
  const html = `<html><head><title>T</title></head><body><main><article><div class="theme-doc-markdown markdown">${bodyHtml}</div></article></main></body></html>`;
  return convertHtmlToMarkdown(
    html,
    {
      rehypeProcessLinks: false,
      remarkGfm: true,
      beforeDefaultRehypePlugins: [exportFlowSnippets],
      remarkPlugins: [normalizeExportLinks, [prependExportContext, { indexUrl: 'https://www.walkeros.io/llms.txt' }]],
    },
    ['.theme-doc-markdown'],
  ).content;
}

describe('export side: convertHtmlToMarkdown with exportFlowSnippets', () => {
  test('hand fixture in the real SSR shape: json fence, pointer caption, guide link', () => {
    const md = toMarkdown(readFileSync(join(FIXTURES, 'slice.html'), 'utf8'));
    assert.match(md, /`\/flows\/web\/collector\/globals`/);
    assert.match(md, /```json\n\{\n {2}"a": 1\n\}\n```/);
    assert.match(md, /\[Guide chapter `state-stores`\]\(https:\/\/github\.com\/elbwalker\/walkerOS\/blob\/main\/packages\/cli\/examples\/flow-complete\.md#state-stores/);
    assert.doesNotMatch(md, /Copy to clipboard/);
  });

  test('a Prism fence and a figure without data-export-lang are untouched', () => {
    const md = toMarkdown(
      '<figure><pre><code>plain</code></pre></figure><pre class="prism-code language-ts"><code>let a</code></pre>',
    );
    assert.doesNotMatch(md, /```json/);
  });

  test('count mismatch throws', () => {
    const fixture = readFileSync(join(FIXTURES, 'slice.html'), 'utf8').replace('data-export-lang="json"', 'data-export-lang="json,json"');
    assert.throws(() => toMarkdown(fixture), /flow|mismatch|count|block/i);
  });

  test('end to end: plugin output rendered to HTML, then exported', async () => {
    const { html } = await compileAndRender(PAGE);
    const md = toMarkdown(html);
    const slice = entry('cmp-category-map');
    const tall = entry('flow-sources');
    assert.ok(md.includes('`' + slice.pointer + '`'), 'pointer caption as inline code');
    assert.ok(md.includes('```json\n' + oracle(resolvePointer(FLOW, slice.pointer)) + '\n```'), 'slice json fence with exact code');
    assert.ok(md.includes('```json\n' + oracle(resolvePointer(FLOW, tall.pointer)) + '\n```'), 'tall slice json fence');
    assert.ok(md.includes(`[Guide chapter \`${slice.chapter}\`](${guideChapterUrl(slice.chapter)})`), 'guide link');
    // FlowExample: Event, Mapping, Out captions and fences.
    assert.match(md, /`Event`\n\n```json\n/);
    assert.match(md, /`Mapping`\n\n```json\n/);
    assert.match(md, /`Out`\n\n```javascript\n/);
    const purchase = entry('ga4-purchase');
    assert.ok(md.includes(`example \`${purchase.example.name}\` of step \`${purchase.example.step}\``));
    // Nothing left unfenced: every fence carries a language.
    const fences = md.match(/^```.*$/gm) ?? [];
    const openers = fences.filter((_, i) => i % 2 === 0);
    assert.ok(openers.length >= 7, `fences: ${openers.length}`);
    for (const opener of openers) assert.notEqual(opener, '```', 'fence without language');
    assert.doesNotMatch(md, /FlowSlice|FlowExample/);
  });

  test('end to end: scalar slice exports as one paragraph', async () => {
    const { html } = await compileAndRender('<FlowSlice feature="package-version" />\n');
    const md = toMarkdown(html);
    const e = entry('package-version');
    assert.ok(md.includes('`' + e.pointer + '`: `'), md);
    assert.doesNotMatch(md, /```/);
  });
});

function mdxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...mdxFiles(path));
    else if (name.endsWith('.mdx')) out.push(path);
  }
  return out;
}

describe('real docs', () => {
  test('every page using the tags transforms, leaving no FlowSlice/FlowExample', () => {
    const files = mdxFiles(join(WEBSITE, 'docs')).filter((path) =>
      /<Flow(Slice|Example)\b/.test(readFileSync(path, 'utf8')),
    );
    assert.ok(files.length >= 10, `pages using the tags: ${files.length}`);
    let tags = 0;
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      tags += (source.match(/<Flow(Slice|Example)\b/g) ?? []).length;
      // Docusaurus strips front matter before MDX; keep line numbers.
      const body = source.replace(/^---\n[\s\S]*?\n---\n/, (m) => '\n'.repeat(m.split('\n').length - 1));
      const tree = transform(body, { path: relative(WEBSITE, path) });
      const left = findAll(tree, (n) => isJsx('FlowSlice')(n) || isJsx('FlowExample')(n));
      assert.equal(left.length, 0, relative(WEBSITE, path));
      const imports = findAll(tree, (n) => n.type === 'mdxjsEsm' && /Flow(Slice|Example)/.test(n.value));
      assert.equal(imports.length, 0, `${relative(WEBSITE, path)} still imports a snippet component`);
    }
    assert.ok(tags >= 95, `tags seen: ${tags}`);
  });

  test('MDXComponents drops FlowSlice/FlowExample and keeps CodeView/StepExample', () => {
    const source = readFileSync(join(WEBSITE, 'src/theme/MDXComponents.js'), 'utf8');
    assert.doesNotMatch(source, /FlowSlice|FlowExample/);
    assert.match(source, /\bCodeView,/);
    assert.match(source, /\bStepExample,/);
  });

  test('docusaurus.config wires both plugins', () => {
    const source = readFileSync(join(WEBSITE, 'docusaurus.config.ts'), 'utf8');
    assert.match(source, /beforeDefaultRemarkPlugins:[\s\S]*?flowSnippets/);
    assert.match(source, /beforeDefaultRehypePlugins:[\s\S]*?exportFlowSnippets/);
  });

  // AK 2026-09-25: an export error must fail the build, not drop the .md.
  test('llms-txt plugin options set onRouteError: throw', () => {
    const source = readFileSync(join(WEBSITE, 'docusaurus.config.ts'), 'utf8');
    assert.match(source, /onRouteError:\s*'throw'/);
  });

  test("'throw' makes the plugin's own route-error path throw, naming the route", async () => {
    // Load the plugin lib the way Docusaurus does (@docusaurus/utils
    // loadFreshModule: jiti with interopDefault). A plain ESM import resolves
    // @docusaurus/logger's CJS default wrongly and every report() call then
    // throws a TypeError, which would pass this test for the wrong reason.
    const jiti = createJiti(import.meta.url, { cache: true, requireCache: false, interopDefault: true });
    const LIB = `${ROOT}/node_modules/@signalwire/docusaurus-plugin-llms-txt/lib`;
    const { createLogger } = jiti(`${LIB}/logging/index.js`);
    const { ERROR_MESSAGES } = jiti(`${LIB}/constants.js`);
    // The real error exportFlowSnippets raises on a count mismatch.
    const bad = readFileSync(join(FIXTURES, 'slice.html'), 'utf8').replace(
      'data-export-lang="json"',
      'data-export-lang="json,json"',
    );
    let cause;
    try {
      toMarkdown(bad);
    } catch (error) {
      cause = error instanceof Error ? error.message : String(error);
    }
    assert.ok(cause, 'the export plugin throws on the bad fixture');
    const route = '/docs/collector/state';
    // Same call as route-processor.js processSingleRoute's catch.
    const message = ERROR_MESSAGES.ROUTE_PROCESSING_FAILED(route, cause);
    assert.throws(
      () => createLogger('llms-txt', 'throw').reportRouteError(message),
      (error) => {
        const text = error instanceof Error ? error.message : String(error);
        assert.ok(text.includes(route), text);
        assert.match(text, /Route Error: /);
        assert.match(text, /export-flow-snippets/);
        return true;
      },
    );
    assert.doesNotThrow(() => createLogger('llms-txt', 'warn').reportRouteError(message));
  });
});

// Loaded inside each test: a failing import in a describe body is not counted
// as a failed test by node:test, so it must surface per test instead.
async function llms() {
  const mod = await import(`${ROOT}/apps/scripts/validate-llms.ts`);
  return typeof mod.findFlowSnippetExportIssues === 'function' ? mod : mod.default;
}

describe('validate-llms: snippet pages keep a json export', () => {
  const FENCE = '```json\n{}\n```\n';
  const run = async (mdx, exported) =>
    (await llms()).findFlowSnippetExportIssues(new Map([['a/page', mdx]]), () => exported, FLOW);

  test('an object slice page with a json fence passes', async () => {
    assert.deepEqual(await run('<FlowSlice feature="cmp-category-map" />', `x\n${FENCE}`), []);
  });
  test('a missing export is reported', async () => {
    const issues = await run('<FlowSlice feature="cmp-category-map" />', undefined);
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /no \.md export/);
  });
  test('an export without a json fence is reported', async () => {
    const issues = await run('<FlowExample feature="ga4-purchase" />', '```\n{}\n```\n');
    assert.ok(issues.some((i) => /json fence/.test(i.message)));
  });
  test('an unresolved tag left in the export is reported', async () => {
    const issues = await run('<FlowSlice feature="cmp-category-map" />', `${FENCE}<FlowSlice feature="x" />`);
    assert.ok(issues.some((i) => /unresolved/.test(i.message)));
  });
  test('a page with only scalar slices needs no fence; pages without tags are ignored', async () => {
    const { needsJsonFence } = await llms();
    assert.equal(needsJsonFence('<FlowSlice feature="express-port" />', FLOW), false);
    assert.equal(needsJsonFence('<FlowSlice feature="express-paths" />', FLOW), true);
    assert.deepEqual(await run('# no snippets', undefined), []);
  });
});
