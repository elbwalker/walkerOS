import { describe, it, expect } from '@jest/globals';
import {
  REF_VAR_FULL,
  REF_VAR_INLINE,
  REF_ENV,
  REF_CONTRACT,
  REF_FLOW,
  REF_STORE,
  REF_SECRET,
  REF_CODE_PREFIX,
} from '../references';
import * as core from '@walkeros/core';

describe('reference regex constants', () => {
  it('REF_VAR_FULL matches whole-string $var.name', () => {
    expect('$var.ga4Id'.match(REF_VAR_FULL)?.[1]).toBe('ga4Id');
  });
  it('REF_VAR_FULL matches whole-string $var.name.path', () => {
    expect('$var.api.url'.match(REF_VAR_FULL)?.[1]).toBe('api.url');
  });
  it('REF_VAR_FULL matches whole-string $var.name.deep.path', () => {
    expect('$var.api.v2.url'.match(REF_VAR_FULL)?.[1]).toBe('api.v2.url');
  });
  it('REF_VAR_FULL does not match mid-string', () => {
    expect('prefix-$var.name'.match(REF_VAR_FULL)).toBeNull();
    expect('$var.name suffix'.match(REF_VAR_FULL)).toBeNull();
  });
  it('REF_VAR_INLINE matches inside strings, captures full dotted path', () => {
    const m = 'https://$var.api.v2/x'.match(REF_VAR_INLINE);
    expect(m?.[0]).toBe('$var.api.v2');
  });
  it('REF_VAR_INLINE captures the dotted path group', () => {
    const re = new RegExp(REF_VAR_INLINE.source, REF_VAR_INLINE.flags);
    const m = re.exec('prefix $var.api.version suffix');
    expect(m?.[1]).toBe('api.version');
  });
  it('REF_VAR_FULL rejects names starting with digits or containing -', () => {
    expect('$var.1foo'.match(REF_VAR_FULL)).toBeNull();
    expect('$var.foo-bar'.match(REF_VAR_FULL)).toBeNull();
  });
  it('REF_VAR_INLINE rejects names starting with digits or containing -', () => {
    // Build a fresh regex from the exported constant so changes to it are caught.
    const reDigit = new RegExp(REF_VAR_INLINE.source, REF_VAR_INLINE.flags);
    expect(reDigit.exec('$var.1foo')).toBeNull();
    const reDash = new RegExp(REF_VAR_INLINE.source, REF_VAR_INLINE.flags);
    // The dash will simply terminate the match at "foo"
    const m = reDash.exec('$var.foo-bar');
    expect(m?.[1]).toBe('foo');
  });
  it('REF_ENV matches name and optional default', () => {
    const m = REF_ENV.exec('$env.API_URL:http://x.test');
    expect(m?.[1]).toBe('API_URL');
    expect(m?.[2]).toBe('http://x.test');
  });
  it('REF_STORE requires dot, not colon', () => {
    expect('$store.cache'.match(REF_STORE)?.[1]).toBe('cache');
    expect('$store:cache'.match(REF_STORE)).toBeNull();
  });
  it('REF_SECRET requires dot + uppercase', () => {
    expect('$secret.API_TOKEN'.match(REF_SECRET)?.[1]).toBe('API_TOKEN');
    expect('$secret:API_TOKEN'.match(REF_SECRET)).toBeNull();
    expect('$secret.apiToken'.match(REF_SECRET)).toBeNull();
  });
  it('REF_CONTRACT is whole-string only', () => {
    expect('$contract.default.events'.match(REF_CONTRACT)?.[1]).toBe('default');
    expect('prefix $contract.default'.match(REF_CONTRACT)).toBeNull();
  });
  it('REF_CODE_PREFIX is literal', () => {
    expect('$code:(e) => e.x'.startsWith(REF_CODE_PREFIX)).toBe(true);
  });
});

describe('REF_FLOW', () => {
  test('matches simple reference', () => {
    const m = '$flow.server.url'.match(REF_FLOW)!;
    expect(m[1]).toBe('server');
    expect(m[2]).toBe('url');
  });

  test('matches reference with deep path', () => {
    const m = '$flow.server.settings.region'.match(REF_FLOW)!;
    expect(m[1]).toBe('server');
    expect(m[2]).toBe('settings.region');
  });

  test('matches reference with no path', () => {
    const m = '$flow.server'.match(REF_FLOW)!;
    expect(m[1]).toBe('server');
    expect(m[2]).toBeUndefined();
  });

  test('does not match partial / inline references', () => {
    expect('prefix$flow.server.url'.match(REF_FLOW)).toBeNull();
    expect('$flow.server.url suffix'.match(REF_FLOW)).toBeNull();
  });
});

describe('core barrel re-exports', () => {
  // Every REF_* constant defined in references.ts must also be reachable
  // through the public package barrel `@walkeros/core`. Consumers like
  // @walkeros/explorer rely on this surface; missing one (as REF_FLOW
  // historically was) is a silent breakage.
  it.each([
    ['REF_VAR_FULL'],
    ['REF_VAR_INLINE'],
    ['REF_ENV'],
    ['REF_CONTRACT'],
    ['REF_FLOW'],
    ['REF_STORE'],
    ['REF_SECRET'],
    ['REF_CODE_PREFIX'],
  ])('%s is exported from the core barrel', (name) => {
    expect(name in core).toBe(true);
  });

  it('REF_FLOW exported from the barrel matches inputs', () => {
    expect('$flow.server.url'.match(core.REF_FLOW)?.[1]).toBe('server');
  });
});
