import { validateFlowConfig } from '../validate-flow-config';
import { validateFlowStructure } from '../../validate-structure';
import type { Flow } from '../../types/flow';

/** A server flow whose collector block carries `observe`, as a file holds it. */
function file(observe: unknown): Flow.Json {
  return JSON.parse(
    JSON.stringify({
      version: 4,
      flows: {
        default: { config: { platform: 'server' }, collector: { observe } },
      },
    }),
  );
}

const usage = {
  url: 'https://ingest.walkeros.io/usage',
  token: '$secret.OBSERVE_USAGE',
};

describe('collector.observe', () => {
  it('accepts a usage and a preview block', () => {
    const json = file({
      usage: { ...usage, interval: 300 },
      preview: { url: 'https://ingest.walkeros.io/preview', token: 'wos' },
    });

    expect(validateFlowConfig(JSON.stringify(json)).errors).toEqual([]);
    expect(validateFlowStructure(json).errors).toEqual([]);
  });

  // The runtime check judges the resolved value.
  it('accepts an $env reference as the url', () => {
    const json = file({
      usage: { ...usage, url: '$env.OBSERVE_URL' },
      preview: { url: '$env.OBSERVE_PREVIEW_URL', token: 'wos' },
    });

    expect(validateFlowConfig(JSON.stringify(json)).errors).toEqual([]);
    expect(validateFlowStructure(json).errors).toEqual([]);
  });

  it.each([
    [
      'an interval below 10 seconds',
      { usage: { ...usage, interval: 5 } },
      'flows.default.collector.observe.usage.interval',
    ],
    [
      'a url without a scheme',
      { usage: { ...usage, url: 'ingest.walkeros.io/usage' } },
      'flows.default.collector.observe.usage.url',
    ],
    [
      'a key it does not know',
      { usage, sessionId: 'v1' },
      'flows.default.collector.observe',
    ],
  ])('refuses %s at its path', (_name, observe, path) => {
    const { errors } = validateFlowConfig(JSON.stringify(file(observe)));

    expect(errors).toEqual([
      expect.objectContaining({ path, severity: 'error' }),
    ]);
  });
});
