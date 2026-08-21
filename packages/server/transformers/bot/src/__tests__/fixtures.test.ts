import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { computeScore, type Signals } from '../detect/score';

interface HeaderFixture {
  name: string;
  class: 'human' | 'bot' | 'agent';
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

// Thresholds match the documented filtering recipe (drop when botScore > 50).
const HUMAN_MAX_BOT_SCORE = 50;
const BOT_MIN_BOT_SCORE = 51;

const humans = cases((f) => f.class === 'human');
const nonHumans = cases((f) => f.class !== 'human');

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
