/**
 * STATIC `config.observe` codegen for bundled-web flows.
 *
 * A self-hosted flow.json with `config.observe: { url, binding }` produces a
 * web entry whose startFlow config carries exactly those PUBLIC values. The
 * runtime connect module does the credential/slot work at boot: the bundle
 * itself must never contain a secret, and an absent `config.observe` must
 * emit zero observe wiring bytes.
 */

import type { Flow, Logger } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { generateWebEntry, readObserveConnect } from '../bundler';

const DATA_PAYLOAD = '{}';

/**
 * Compose the bundler's config read with the web entry codegen, mirroring
 * the single-stage bundled-web call site in bundleCore.
 */
function wrapWebEntryFor(flow: Flow, logger?: Logger.Instance): string {
  return generateWebEntry('./skel.mjs', DATA_PAYLOAD, {
    windowCollector: 'walkerOS',
    observe: readObserveConnect(flow, logger),
  });
}

const flowWithObserve: Flow = {
  config: {
    platform: 'web',
    observe: { url: 'https://obs.example', binding: 'pb_x' },
  },
};

describe('generateWebEntry observe connect codegen', () => {
  it('emits the connect module wiring with only the public url + binding', () => {
    const out = wrapWebEntryFor(flowWithObserve);
    expect(out).toContain('https://obs.example');
    expect(out).toContain('pb_x');
    // The observe pair rides the startFlow config: set before the call.
    const observeIdx = out.indexOf('config.observe');
    const startFlowIdx = out.indexOf('await startFlow(config)');
    expect(observeIdx).toBeGreaterThan(-1);
    expect(startFlowIdx).toBeGreaterThan(observeIdx);
  });

  it('never emits a token or obsw_ secret literal into the bundle', () => {
    const out = wrapWebEntryFor(flowWithObserve);
    expect(out).not.toMatch(/obsw_/);
    expect(out).not.toMatch(/ingestToken|serverIngestToken|webIngestToken/);
    // Defensive widenings: no token-shaped option, bearer header, or
    // session id may ever appear in the emitted entry.
    expect(out).not.toMatch(/token/i);
    expect(out).not.toMatch(/Bearer/);
    expect(out).not.toMatch(/sessionId/);
    // No baked observer machinery or trace-poll loop either: the connect
    // module is pure config and the runtime installs the observer at boot.
    expect(out).not.toContain('__pollTrace');
    expect(out).not.toContain('setInterval');
    expect(out).not.toContain('collector.observers.add');
  });

  it('omits all observe wiring when config.observe is absent (zero bytes)', () => {
    const out = wrapWebEntryFor({ config: { platform: 'web' } });
    expect(out).not.toContain('elbObserve');
    expect(out).not.toMatch(/observe/i);
  });

  it('emits valid JS string literals for values needing escaping', () => {
    const out = wrapWebEntryFor({
      config: {
        platform: 'web',
        observe: { url: 'https://obs.example/x?a="b"', binding: 'pb_x' },
      },
    });
    expect(out).toContain(JSON.stringify('https://obs.example/x?a="b"'));
  });
});

describe('readObserveConnect', () => {
  it('returns the public pair when both url and binding are set', () => {
    expect(readObserveConnect(flowWithObserve)).toEqual({
      url: 'https://obs.example',
      binding: 'pb_x',
    });
  });

  it('carries the public level and sample controls beside the pair', () => {
    // Dropping level here would silently override an explicit opt-out: the
    // runtime defaults an absent level to 'standard' once a credential
    // attaches.
    const result = readObserveConnect({
      config: {
        platform: 'web',
        observe: {
          url: 'https://obs.example',
          binding: 'pb_x',
          level: 'trace',
          sample: 0.5,
        },
      },
    });
    expect(result).toEqual({
      url: 'https://obs.example',
      binding: 'pb_x',
      level: 'trace',
      sample: 0.5,
    });
  });

  it('preserves an explicit level off (the opt-out must survive the bake)', () => {
    expect(
      readObserveConnect({
        config: {
          platform: 'web',
          observe: {
            url: 'https://obs.example',
            binding: 'pb_x',
            level: 'off',
          },
        },
      }),
    ).toEqual({ url: 'https://obs.example', binding: 'pb_x', level: 'off' });
  });

  it('omits level and sample when the flow config does not set them', () => {
    expect(readObserveConnect(flowWithObserve)).toEqual({
      url: 'https://obs.example',
      binding: 'pb_x',
    });
  });

  it('returns undefined when config or observe is absent', () => {
    expect(readObserveConnect({})).toBeUndefined();
    expect(readObserveConnect({ config: { platform: 'web' } })).toBeUndefined();
  });

  it('returns undefined for a level-only observe block (telemetry form)', () => {
    expect(
      readObserveConnect({
        config: { platform: 'web', observe: { level: 'standard' } },
      }),
    ).toBeUndefined();
  });

  it('returns undefined for a partial or empty pair', () => {
    expect(
      readObserveConnect({
        config: { platform: 'web', observe: { url: 'https://obs.example' } },
      }),
    ).toBeUndefined();
    expect(
      readObserveConnect({
        config: { platform: 'web', observe: { binding: 'pb_x' } },
      }),
    ).toBeUndefined();
    expect(
      readObserveConnect({
        config: { platform: 'web', observe: { url: '', binding: 'pb_x' } },
      }),
    ).toBeUndefined();
    expect(
      readObserveConnect({
        config: {
          platform: 'web',
          observe: { url: 'https://obs.example', binding: '' },
        },
      }),
    ).toBeUndefined();
  });

  it('trims url and binding before the check and in the returned pair', () => {
    const logger = createMockLogger();
    expect(
      readObserveConnect(
        {
          config: {
            platform: 'web',
            observe: { url: '  https://obs.example  ', binding: ' pb_x ' },
          },
        },
        logger,
      ),
    ).toEqual({ url: 'https://obs.example', binding: 'pb_x' });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('readObserveConnect build-time warnings', () => {
  it('warns and emits nothing for a partial pair (url without binding)', () => {
    const logger = createMockLogger();
    const flow: Flow = {
      config: { platform: 'web', observe: { url: 'https://obs.example' } },
    };
    const out = wrapWebEntryFor(flow, logger);
    expect(out).not.toMatch(/observe/i);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('config.observe');
    expect(logger.warn.mock.calls[0][0]).toContain('binding');
  });

  it('warns and emits nothing for a partial pair (binding without url)', () => {
    const logger = createMockLogger();
    const flow: Flow = {
      config: { platform: 'web', observe: { binding: 'pb_x' } },
    };
    const out = wrapWebEntryFor(flow, logger);
    expect(out).not.toMatch(/observe/i);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('url');
  });

  it('warns for whitespace-only members', () => {
    const logger = createMockLogger();
    expect(
      readObserveConnect(
        {
          config: {
            platform: 'web',
            observe: { url: '   ', binding: 'pb_x' },
          },
        },
        logger,
      ),
    ).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('url');
  });

  it('warns naming both members when both are missing or empty', () => {
    const logger = createMockLogger();
    expect(
      readObserveConnect(
        {
          config: { platform: 'web', observe: { url: ' ', binding: '' } },
        },
        logger,
      ),
    ).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('url');
    expect(logger.warn.mock.calls[0][0]).toContain('binding');
  });

  it('stays SILENT for a level/sample-only observe block and emits nothing', () => {
    const logger = createMockLogger();
    const flow: Flow = {
      config: {
        platform: 'web',
        observe: { level: 'standard', sample: 0.5 },
      },
    };
    const out = wrapWebEntryFor(flow, logger);
    expect(out).not.toMatch(/observe/i);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('emits the trimmed literals into the entry for a padded full pair', () => {
    const out = wrapWebEntryFor({
      config: {
        platform: 'web',
        observe: { url: ' https://obs.example ', binding: ' pb_x ' },
      },
    });
    expect(out).toContain('"https://obs.example"');
    expect(out).toContain('"pb_x"');
    expect(out).not.toContain(' https://obs.example ');
  });
});
