import {
  containsCodeMarkers,
  classifyStepProperties,
} from '../config-classifier';

describe('containsCodeMarkers', () => {
  it('detects $code: prefix', () => {
    expect(containsCodeMarkers('$code:(v) => v')).toBe(true);
  });
  it('detects $store: prefix', () => {
    expect(containsCodeMarkers('$store:memory')).toBe(true);
  });
  it('detects __WALKEROS_ENV: marker', () => {
    expect(containsCodeMarkers('__WALKEROS_ENV:API_KEY')).toBe(true);
  });
  it('detects __WALKEROS_ENV: in middle of string', () => {
    expect(containsCodeMarkers('prefix__WALKEROS_ENV:KEY')).toBe(true);
  });
  it('returns false for plain string', () => {
    expect(containsCodeMarkers('G-ABC123')).toBe(false);
  });
  it('returns false for number', () => {
    expect(containsCodeMarkers(8080)).toBe(false);
  });
  it('returns false for boolean', () => {
    expect(containsCodeMarkers(true)).toBe(false);
  });
  it('returns false for null', () => {
    expect(containsCodeMarkers(null)).toBe(false);
  });
  it('returns false for undefined', () => {
    expect(containsCodeMarkers(undefined)).toBe(false);
  });
  it('detects nested code markers in objects', () => {
    expect(containsCodeMarkers({ nested: { deep: '$code:fn()' } })).toBe(true);
  });
  it('detects code markers in arrays', () => {
    expect(containsCodeMarkers(['normal', '$store:x'])).toBe(true);
  });
  it('returns false for plain objects', () => {
    expect(containsCodeMarkers({ a: 1, b: 'hello' })).toBe(false);
  });
  it('returns false for empty object', () => {
    expect(containsCodeMarkers({})).toBe(false);
  });
  it('returns false for empty array', () => {
    expect(containsCodeMarkers([])).toBe(false);
  });
});

describe('classifyStepProperties', () => {
  it('puts code key in code layer', () => {
    const { codeProps, dataProps } = classifyStepProperties({
      code: 'sourceExpress',
      config: { settings: { port: 8080 } },
    });
    expect(codeProps).toEqual({ code: 'sourceExpress' });
    expect(dataProps).toEqual({ config: { settings: { port: 8080 } } });
  });

  it('puts $store: env in code layer', () => {
    const { codeProps, dataProps } = classifyStepProperties({
      code: 'destGa4',
      config: { settings: { id: 'G-ABC' } },
      env: { store: '$store:memory' },
    });
    expect(codeProps).toEqual({
      code: 'destGa4',
      env: { store: '$store:memory' },
    });
    expect(dataProps).toEqual({ config: { settings: { id: 'G-ABC' } } });
  });

  it('puts chains in data layer', () => {
    const { codeProps, dataProps } = classifyStepProperties({
      code: 'destGa4',
      before: ['fingerprint'],
      next: ['log'],
    });
    expect(codeProps).toEqual({ code: 'destGa4' });
    expect(dataProps).toEqual({ before: ['fingerprint'], next: ['log'] });
  });

  it('puts cache in data layer', () => {
    const { codeProps, dataProps } = classifyStepProperties({
      code: 'destGa4',
      cache: { key: 'event.name', ttl: 300 },
    });
    expect(codeProps).toEqual({ code: 'destGa4' });
    expect(dataProps).toEqual({ cache: { key: 'event.name', ttl: 300 } });
  });

  it('puts $code: config in code layer', () => {
    const { codeProps, dataProps } = classifyStepProperties({
      code: 'transformer',
      config: { settings: { transform: '$code:(e) => e' } },
    });
    expect(codeProps).toEqual({
      code: 'transformer',
      config: { settings: { transform: '$code:(e) => e' } },
    });
    expect(dataProps).toEqual({});
  });

  it('handles step with no data properties', () => {
    const { codeProps, dataProps } = classifyStepProperties({
      code: 'myCode',
      env: { fn: '$code:() => {}' },
    });
    expect(codeProps).toEqual({
      code: 'myCode',
      env: { fn: '$code:() => {}' },
    });
    expect(dataProps).toEqual({});
  });

  it('handles step with only code key', () => {
    const { codeProps, dataProps } = classifyStepProperties({
      code: 'myCode',
    });
    expect(codeProps).toEqual({ code: 'myCode' });
    expect(dataProps).toEqual({});
  });
});
