import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  walkerjsPinnedUrl,
  walkerjsUrl,
} from '../src/components/snippets/walkerjs-url.ts';

test('major.minor slot', () => {
  assert.equal(walkerjsUrl('4.7.3'), 'https://static.walkeros.io/v4.7/walker.js');
});

test('prerelease maps to its line', () => {
  assert.equal(
    walkerjsUrl('4.8.0-next-123'),
    'https://static.walkeros.io/v4.8/walker.js',
  );
});

test('pinned url names the exact release', () => {
  assert.equal(
    walkerjsPinnedUrl('4.7.3'),
    'https://static.walkeros.io/v4.7.3/walker.js',
  );
});
