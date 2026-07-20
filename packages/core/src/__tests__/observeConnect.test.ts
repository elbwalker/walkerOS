import { parseObserveCredential, observeFromEnv } from '../observeConnect';

describe('parseObserveCredential', () => {
  it('parses a well-formed obsw_ credential', () => {
    expect(parseObserveCredential('obsw_pbX.sesY.secretZ')).toEqual({
      pb: 'pbX',
      ses: 'sesY',
      secret: 'secretZ',
    });
  });
  it('returns null (never throws) on every malformed shape', () => {
    for (const bad of [
      '',
      'obsw_',
      'obsw_only',
      'obsw_a.b',
      'nope_a.b.c',
      'obsw_a.b.c.d',
      'obsw_a..c',
    ]) {
      expect(parseObserveCredential(bad)).toBeNull();
    }
  });
});

describe('observeFromEnv', () => {
  it('builds ObserveServer from the WALKEROS_* trio + level', () => {
    expect(
      observeFromEnv({
        WALKEROS_OBSERVER_URL: 'https://obs.example',
        WALKEROS_DEPLOYMENT_ID: 'ses_1',
        WALKEROS_INGEST_TOKEN: 'tok',
        WALKEROS_OBSERVE_LEVEL: 'trace',
      }),
    ).toEqual({
      url: 'https://obs.example',
      sessionId: 'ses_1',
      token: 'tok',
      level: 'trace',
    });
  });
  it('returns undefined when the trio is absent (zero work)', () => {
    expect(observeFromEnv({})).toBeUndefined();
  });
  it('returns undefined when any required member is missing', () => {
    expect(
      observeFromEnv({
        WALKEROS_OBSERVER_URL: 'x',
        WALKEROS_DEPLOYMENT_ID: 'y',
      }),
    ).toBeUndefined();
  });
  it('fails closed on an unknown explicit level (never silently standard)', () => {
    // A typo'd opt-out (`offf`) must not degrade into active observation.
    expect(
      observeFromEnv({
        WALKEROS_OBSERVER_URL: 'https://obs.example',
        WALKEROS_DEPLOYMENT_ID: 'ses_1',
        WALKEROS_INGEST_TOKEN: 'tok',
        WALKEROS_OBSERVE_LEVEL: 'offf',
      }),
    ).toBeUndefined();
  });
});
