import { describe, it, expect } from '@jest/globals';
import {
  REF_VAR,
  REF_DEF,
  REF_ENV,
  REF_CONTRACT,
  REF_STORE,
  REF_SECRET,
  REF_CODE_PREFIX,
} from '../references';

describe('reference regex constants', () => {
  it('REF_VAR matches $var.name inline', () => {
    expect('prefix $var.ga4Id suffix'.match(REF_VAR)?.[0]).toBe('$var.ga4Id');
  });
  it('REF_DEF requires whole string', () => {
    expect('$def.foo.bar'.match(REF_DEF)?.[1]).toBe('foo');
    expect('$def.foo.bar'.match(REF_DEF)?.[2]).toBe('bar');
    expect('prefix $def.foo'.match(REF_DEF)).toBeNull();
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
