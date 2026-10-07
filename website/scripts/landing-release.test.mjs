import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The announcement bar names the release line; a version that does not parse
// must fail the build, never show "vundefined". Run with tsx.
const WEBSITE = new URL('..', import.meta.url).pathname;
const { releaseLine } = await import(
  `${WEBSITE}src/components/landing/release.ts`
);

test('the release line is major.minor', () => {
  assert.equal(releaseLine('4.7.2'), '4.7');
  assert.equal(releaseLine('10.0.0'), '10.0');
});

test('a version that is not x.y.z throws', () => {
  for (const version of ['4.7', '4.7.2-next.0', 'v4.7.2', ''])
    assert.throws(() => releaseLine(version), /not x\.y\.z/, version);
});

test('the config builds the announcement bar from the site version', () => {
  const config = readFileSync(join(WEBSITE, 'docusaurus.config.ts'), 'utf8');
  const bar = config.slice(
    config.indexOf('announcementBar: {'),
    config.indexOf('navbar: {'),
  );
  assert.match(config, /const release = releaseLine\(walkerosVersion\);/);
  assert.match(bar, /id: `release-v\$\{release\}`/);
  // Colours set here become inline styles that no token can reach.
  assert.doesNotMatch(bar, /backgroundColor|textColor/);
});
