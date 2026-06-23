import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteLink } from './rewrite-links.mjs';

const BLOB = 'https://github.com/elbwalker/walkerOS/blob/main';

test('external links pass through unchanged', () => {
  assert.deepEqual(rewriteLink('https://www.walkeros.io', 'walkeros-using-cli'), {
    href: 'https://www.walkeros.io',
  });
  assert.deepEqual(rewriteLink('http://example.com', 'walkeros-using-cli'), {
    href: 'http://example.com',
  });
  assert.deepEqual(rewriteLink('mailto:hi@elbwalker.com', 'walkeros-using-cli'), {
    href: 'mailto:hi@elbwalker.com',
  });
});

test('pure in-page anchors pass through', () => {
  assert.deepEqual(
    rewriteLink('#adding-setup-optional', 'walkeros-create-destination'),
    { href: '#adding-setup-optional' },
  );
});

test('cross-skill link -> /skills/<name>', () => {
  assert.deepEqual(
    rewriteLink('../walkeros-understanding-flow/SKILL.md', 'walkeros-using-cli'),
    { href: '/skills/walkeros-understanding-flow' },
  );
});

test('cross-skill link preserves #anchor', () => {
  assert.deepEqual(
    rewriteLink(
      '../walkeros-understanding-sources/SKILL.md#setup-optional',
      'walkeros-create-source',
    ),
    { href: '/skills/walkeros-understanding-sources#setup-optional' },
  );
  assert.deepEqual(
    rewriteLink(
      '../walkeros-using-cli/SKILL.md#bundle-externals-per-package-walkerosbundleexternal',
      'walkeros-create-destination',
    ),
    {
      href: '/skills/walkeros-using-cli#bundle-externals-per-package-walkerosbundleexternal',
    },
  );
});

test('website docs link -> /docs/<path> (extension stripped)', () => {
  assert.deepEqual(
    rewriteLink(
      '../../website/docs/collector/cache.mdx',
      'walkeros-understanding-stores',
    ),
    { href: '/docs/collector/cache' },
  );
  assert.deepEqual(
    rewriteLink(
      '../../website/docs/transformers/validate.mdx',
      'walkeros-create-transformer',
    ),
    { href: '/docs/transformers/validate' },
  );
});

test('website docs index page -> directory route (no /index)', () => {
  assert.deepEqual(
    rewriteLink('../../website/docs/stores/index.mdx', 'walkeros-understanding-stores'),
    { href: '/docs/stores/' },
  );
  assert.deepEqual(
    rewriteLink(
      '../../website/docs/sources/web/browser/index.mdx',
      'walkeros-understanding-sources',
    ),
    { href: '/docs/sources/web/browser/' },
  );
});

test('website docs index page preserves #anchor on directory route', () => {
  assert.deepEqual(
    rewriteLink(
      '../../website/docs/sources/web/browser/index.mdx#run',
      'walkeros-understanding-sources',
    ),
    { href: '/docs/sources/web/browser/#run' },
  );
});

test('website docs (non-index) link preserves #anchor', () => {
  assert.deepEqual(
    rewriteLink(
      '../../website/docs/collector/state.mdx#reactivity',
      'walkeros-understanding-flow',
    ),
    { href: '/docs/collector/state#reactivity' },
  );
});

test('../../packages/... -> GitHub blob (anchor dropped)', () => {
  assert.deepEqual(
    rewriteLink(
      '../../packages/core/src/types/flow.ts',
      'walkeros-understanding-flow',
    ),
    { href: `${BLOB}/packages/core/src/types/flow.ts` },
  );
  // Code/line anchors are dropped on blob links.
  assert.deepEqual(
    rewriteLink(
      '../../packages/core/src/mapping.ts#L42',
      'walkeros-understanding-mapping',
    ),
    { href: `${BLOB}/packages/core/src/mapping.ts` },
  );
});

test('../../AGENT.md and ../../apps/... -> GitHub blob', () => {
  assert.deepEqual(
    rewriteLink('../../AGENT.md', 'walkeros-understanding-development'),
    { href: `${BLOB}/AGENT.md` },
  );
  assert.deepEqual(
    rewriteLink('../../apps/quickstart/', 'walkeros-using-step-examples'),
    { href: `${BLOB}/apps/quickstart` },
  );
});

test('./examples and ./templates -> GitHub blob (sibling of SKILL.md)', () => {
  assert.deepEqual(
    rewriteLink('./examples/env.ts', 'walkeros-create-cmp-source'),
    { href: `${BLOB}/skills/walkeros-create-cmp-source/examples/env.ts` },
  );
  assert.deepEqual(
    rewriteLink('./templates/cmp/index.ts', 'walkeros-create-cmp-source'),
    { href: `${BLOB}/skills/walkeros-create-cmp-source/templates/cmp/index.ts` },
  );
});

test('bare-sibling file -> GitHub blob (sibling of SKILL.md)', () => {
  assert.deepEqual(
    rewriteLink('value-strategies.md', 'walkeros-understanding-mapping'),
    {
      href: `${BLOB}/skills/walkeros-understanding-mapping/value-strategies.md`,
    },
  );
  assert.deepEqual(
    rewriteLink('commands-reference.md', 'walkeros-using-cli'),
    { href: `${BLOB}/skills/walkeros-using-cli/commands-reference.md` },
  );
  assert.deepEqual(rewriteLink('examples/', 'walkeros-create-destination'), {
    href: `${BLOB}/skills/walkeros-create-destination/examples`,
  });
  assert.deepEqual(
    rewriteLink('templates/cmp/', 'walkeros-create-cmp-source'),
    { href: `${BLOB}/skills/walkeros-create-cmp-source/templates/cmp` },
  );
});

test('real in-site absolute /docs route is kept (with anchor)', () => {
  assert.deepEqual(
    rewriteLink(
      '/docs/mapping/rule#patching-package-shipped-rules',
      'walkeros-mapping-configuration',
    ),
    { href: '/docs/mapping/rule#patching-package-shipped-rules' },
  );
});

test('placeholder /docs/... is dropped (rendered as inline code)', () => {
  const result = rewriteLink('/docs/...', 'walkeros-writing-documentation');
  assert.equal(result.drop, true);
});
