import type { Flow } from '@walkeros/core';
import {
  buildFlagDefines,
  flowNeeds,
  needsMarker,
  readNeedsMarker,
} from '../build-flags';

const destination = { package: '@walkeros/web-destination-api' };

describe('flowNeeds', () => {
  it('a plain flow needs nothing optional', () => {
    const flow: Flow = {
      config: { platform: 'web' },
      sources: { browser: { package: '@walkeros/web-source-browser' } },
      destinations: { api: { ...destination, config: { settings: {} } } },
    };
    expect(flowNeeds(flow)).toEqual({
      observe: false,
      stores: false,
      state: false,
    });
  });

  it('stores follow declared stores', () => {
    expect(flowNeeds({ stores: {} }).stores).toBe(false);
    expect(
      flowNeeds({ stores: { kv: { package: '@walkeros/store-memory' } } })
        .stores,
    ).toBe(true);
  });

  it('state follows a top-level or config state on any step', () => {
    const state = { mode: 'get', key: 'event.user.id' } as const;
    expect(flowNeeds({ sources: { s: { package: 'x', state } } }).state).toBe(
      true,
    );
    expect(
      flowNeeds({ transformers: { t: { config: { state } } } }).state,
    ).toBe(true);
    expect(
      flowNeeds({ destinations: { d: { ...destination, config: { state } } } })
        .state,
    ).toBe(true);
  });

  it('a config the CLI cannot read counts as state', () => {
    expect(
      flowNeeds({ destinations: { d: { ...destination, config: '$var.cfg' } } })
        .state,
    ).toBe(true);
  });
});

describe('buildFlagDefines', () => {
  it('defines every flag from the needs, with validation off', () => {
    expect(
      buildFlagDefines({ observe: false, stores: true, state: false }, false),
    ).toEqual({
      __WALKEROS_OBSERVE__: 'false',
      __WALKEROS_STORES__: 'true',
      __WALKEROS_STATE__: 'false',
      __WALKEROS_VALIDATE__: 'false',
    });
  });

  it('turns every other flag on without needs', () => {
    expect(buildFlagDefines(undefined, false)).toEqual({
      __WALKEROS_OBSERVE__: 'false',
      __WALKEROS_STORES__: 'true',
      __WALKEROS_STATE__: 'true',
      __WALKEROS_VALIDATE__: 'true',
    });
  });

  // The reporter's flag is the caller's alone, never the needs' bit.
  it.each([
    ['needs that say observe', { observe: true, stores: false, state: false }],
    ['needs that do not', { observe: false, stores: false, state: false }],
    ['no needs', undefined],
  ])('takes the reporter flag from its caller, with %s', (_name, needs) => {
    expect(buildFlagDefines(needs, false).__WALKEROS_OBSERVE__).toBe('false');
    expect(buildFlagDefines(needs, true).__WALKEROS_OBSERVE__).toBe('true');
  });
});

describe('needs marker', () => {
  const needs = { observe: false, stores: false, state: true };

  it('round-trips at the end of a skeleton', () => {
    const skeleton = `export const __configData = {};\n${needsMarker(needs)}\n`;
    expect(readNeedsMarker(skeleton)).toEqual(needs);
  });

  it('is absent from an older skeleton', () => {
    expect(readNeedsMarker('export const __configData = {};\n')).toBe(
      undefined,
    );
  });

  it('is ignored anywhere but the end', () => {
    const skeleton = `${needsMarker(needs)}\nexport const __configData = {};\n`;
    expect(readNeedsMarker(skeleton)).toBe(undefined);
  });

  it('rejects a malformed marker', () => {
    expect(readNeedsMarker('/* walkeros:needs {"observe":"yes"} */')).toBe(
      undefined,
    );
  });
});
