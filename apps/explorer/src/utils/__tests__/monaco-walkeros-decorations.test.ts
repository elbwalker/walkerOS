import {
  findWalkerOSReferences,
  REFERENCE_PATTERNS,
} from '../monaco-walkeros-decorations';

describe('findWalkerOSReferences', () => {
  it('finds $var. references in a string', () => {
    const text = '"$var.measurementId"';
    const matches = findWalkerOSReferences(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe('variable');
    expect(matches[0].name).toBe('measurementId');
  });

  it('finds $def. references', () => {
    const text = '"$def.gaConfig"';
    const matches = findWalkerOSReferences(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe('definition');
    expect(matches[0].name).toBe('gaConfig');
  });

  it('finds $secret. and $env. references', () => {
    const text = '"$secret.API_KEY" and "$env.GA_ID"';
    const matches = findWalkerOSReferences(text);
    expect(matches).toHaveLength(2);
    expect(matches.find((m) => m.type === 'secret')).toBeDefined();
    expect(matches.find((m) => m.type === 'env')).toBeDefined();
  });

  it('finds $code: references', () => {
    const text = '"$code:(event) => event.data"';
    const matches = findWalkerOSReferences(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe('code');
  });

  it('returns empty array for plain strings', () => {
    const text = '"just a normal string"';
    expect(findWalkerOSReferences(text)).toHaveLength(0);
  });

  it('finds multiple references in multi-line text', () => {
    const text = '{\n  "id": "$var.trackingId",\n  "key": "$secret.API_KEY"\n}';
    const matches = findWalkerOSReferences(text);
    expect(matches).toHaveLength(2);
  });

  it('finds references with prefix only (no name after dot)', () => {
    const refs = findWalkerOSReferences('"$var."');
    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe('variable');
    expect(refs[0].name).toBe('');
  });

  it('finds $def. prefix only', () => {
    const refs = findWalkerOSReferences('"$def."');
    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe('definition');
  });

  it('finds $secret. prefix only', () => {
    const refs = findWalkerOSReferences('"$secret."');
    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe('secret');
  });

  it('finds $env. prefix only', () => {
    const refs = findWalkerOSReferences('"$env."');
    expect(refs).toHaveLength(1);
    expect(refs[0].type).toBe('env');
  });
});

describe('REFERENCE_PATTERNS', () => {
  it('exports pattern definitions', () => {
    expect(REFERENCE_PATTERNS).toBeDefined();
    expect(REFERENCE_PATTERNS.length).toBeGreaterThan(0);
  });
});
