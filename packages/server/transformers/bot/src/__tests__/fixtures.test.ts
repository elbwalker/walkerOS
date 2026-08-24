import type { Transformer, WalkerOS } from '@walkeros/core';
import { createIngest, createMockContext } from '@walkeros/core';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { computeScore, type Signals } from '../detect/score';
import { transformerBot } from '../transformer';
import type { BotSettings } from '../types';

interface HeaderFixture {
  name: string;
  /**
   * `spoof` is a client that looks like a browser in its User-Agent and like a
   * script in every other header. It is only detectable once the operator has
   * declared the signals and pinned a context, so it is scored by the routing
   * suite below rather than by the unwired baseline rules.
   */
  class: 'human' | 'bot' | 'agent' | 'spoof';
  context?: 'navigation' | 'pixel' | 'beacon' | 'fetch' | 'server';
  provenance: string;
  signals: Signals;
}

const dir = join(__dirname, 'fixtures', 'headers');
const fixtures: HeaderFixture[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')));

const cases = (predicate: (f: HeaderFixture) => boolean) =>
  fixtures.filter(predicate).map((f) => [f.name, f] as const);

const byName = (name: string): HeaderFixture => {
  const fixture = fixtures.find((f) => f.name === name);
  if (!fixture) throw new Error(`no header fixture named "${name}"`);
  return fixture;
};

// Thresholds match the documented filtering recipe (drop when botScore > 50).
const HUMAN_MAX_BOT_SCORE = 50;
const BOT_MIN_BOT_SCORE = 51;

const humans = cases((f) => f.class === 'human');
const nonHumans = cases((f) => f.class === 'bot' || f.class === 'agent');

describe('header fixtures', () => {
  it('has captures to guard with', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  if (humans.length) {
    it.each(humans)(
      'human capture %s stays below the filter threshold',
      (_, f) => {
        expect(computeScore(f.signals).botScore).toBeLessThanOrEqual(
          HUMAN_MAX_BOT_SCORE,
        );
      },
    );
  }

  it.each(nonHumans)(
    'bot/agent capture %s stays above the filter threshold',
    (_, f) => {
      expect(computeScore(f.signals).botScore).toBeGreaterThanOrEqual(
        BOT_MIN_BOT_SCORE,
      );
    },
  );

  it.each(cases((f) => f.class === 'agent'))(
    'agent capture %s is identified as an agent',
    (_, f) => {
      expect(computeScore(f.signals).botCategory).toMatch(
        /^ai-(agent|crawler)$/,
      );
    },
  );

  it.each(cases(() => true))('fixture %s documents its provenance', (_, f) => {
    expect(f.provenance.length).toBeGreaterThan(10);
  });
});

describe('real captures through one context-routing instance', () => {
  // The deployment shape: the sender annotates the collect URL, the source
  // lifts the parameter into ingest, and everything that arrives unannotated
  // is a beacon. One instance serves every transport.
  const settings: BotSettings = {
    context: [{ key: 'ingest.transport' }, { value: 'beacon' }],
    input: {
      acceptLanguage: 'ingest.acceptLanguage',
      acceptEncoding: 'ingest.acceptEncoding',
      secFetchSite: 'ingest.secFetchSite',
      secFetchMode: 'ingest.secFetchMode',
      secFetchDest: 'ingest.secFetchDest',
      secChUa: 'ingest.secChUa',
    },
  };

  type Types = Transformer.Types<BotSettings>;

  const event: WalkerOS.DeepPartialEvent = {
    name: 'page view',
    data: { title: 'Home' },
  };

  const push = async (fixtureName: string, transport?: string) => {
    const instance = await transformerBot(
      createMockContext<Types>({ id: 'bot', config: { settings } }),
    );
    const ctx = createMockContext<Types>({
      id: 'bot',
      ingest: {
        ...createIngest('test'),
        ...byName(fixtureName).signals,
        ...(transport === undefined ? {} : { transport }),
      },
    });
    const result = await instance.push(event, ctx);
    return { result, ingest: ctx.ingest };
  };

  const human = { botScore: 0, botCategory: 'human' };
  // An empty reason array is the claim that matters: not merely "scored 0", but
  // "a pipeline with every check unlocked had nothing at all to say". It also
  // asserts the premise, since an undeclared input or an unresolved context
  // announces itself here as a *_not_declared or context_undetermined note.
  const nothingToReport = { bot: { reasons: [] } };

  test('a Chrome pixel request annotated transport=pixel stays human', async () => {
    const { result, ingest } = await push('chrome-pixel', 'pixel');
    expect(result).toMatchObject({ event: { user: human } });
    expect(ingest).toMatchObject(nothingToReport);
  });

  test('an unannotated Chrome sendBeacon post falls back to beacon and stays human', async () => {
    const { result, ingest } = await push('chrome-beacon');
    expect(result).toMatchObject({ event: { user: human } });
    // The wildcard Accept and text/plain body are only benign under a beacon
    // profile, so a clean sheet proves the fallback entry pinned one.
    expect(ingest).toMatchObject(nothingToReport);
  });

  test('a Firefox navigation stays human despite sending no client hints', async () => {
    const { result, ingest } = await push('firefox-navigation', 'navigation');
    expect(result).toMatchObject({ event: { user: human } });
    // Sec-CH-UA is declared and absent, which is ch_missing_on_chromium for a
    // Chromium UA. Firefox is not one, so the check must stay silent.
    expect(ingest).toMatchObject(nothingToReport);
  });

  test('a wildcard Accept earns the typed-accept penalty under pixel', async () => {
    const { ingest } = await push('spoofed-chrome-wildcard-accept', 'pixel');
    expect(ingest).toMatchObject({
      bot: {
        reasons: expect.arrayContaining(['accept_generic_on_typed_context']),
      },
    });
  });

  test('the same wildcard Accept is unremarkable under beacon', async () => {
    const { ingest } = await push('spoofed-chrome-wildcard-accept');
    expect(ingest).not.toMatchObject({
      bot: {
        reasons: expect.arrayContaining(['accept_generic_on_typed_context']),
      },
    });
  });
});
