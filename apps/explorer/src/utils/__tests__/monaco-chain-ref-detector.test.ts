import {
  detectChainRefContext,
  detectKeyContext,
} from '../monaco-chain-ref-detector';

const json = `{
  "flows": { "web": { "transformers": {
    "enrich":   { "before": ["|A", "t2"] },
    "validate": { "next":   [{ "match": "*", "next": "|B" }] },
    "filter":   { "next": "|C" }
  } } }
}`;

describe('detectChainRefContext', () => {
  it('detects inline-array element as before', () => {
    const offset = json.indexOf('|A') + 1;
    expect(detectChainRefContext(json, offset)).toBe('before');
  });
  it('detects Route[] inner next', () => {
    const offset = json.indexOf('|B') + 1;
    expect(detectChainRefContext(json, offset)).toBe('next');
  });
  it('detects scalar next', () => {
    const offset = json.indexOf('|C') + 1;
    expect(detectChainRefContext(json, offset)).toBe('next');
  });
  it('returns null outside chain refs', () => {
    const offset = json.indexOf('enrich') + 1;
    expect(detectChainRefContext(json, offset)).toBeNull();
  });
});

describe('detectKeyContext', () => {
  const pkgJson = `{
    "sources": {
      "browser": {
        "package":
          "|X"
      }
    }
  }`;
  it('detects multi-line scalar value for given key', () => {
    const offset = pkgJson.indexOf('|X') + 1;
    expect(detectKeyContext(pkgJson, offset, 'package')).toBe(true);
  });
  it('returns false for unrelated offset', () => {
    const offset = pkgJson.indexOf('sources') + 1;
    expect(detectKeyContext(pkgJson, offset, 'package')).toBe(false);
  });
});
