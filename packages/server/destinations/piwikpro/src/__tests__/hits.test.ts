import type { Collector, WalkerOS } from '@walkeros/core';
import type { Hit, Rule, Settings } from '../types';
import type { BuildResult } from '../hits';
import { getEvent } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { getHashServer } from '@walkeros/server-core';
import { buildHits } from '../hits';

declare const __VERSION__: string;

const settings: Settings = { url: 'https://acc.piwik.pro/', appId: 'site-1' };
const SOURCE = {
  type: 'collector',
  schema: '4',
  url: 'https://www.example.com/docs/',
};

describe('buildHits', () => {
  let collector: Collector.Instance;

  beforeAll(async () => {
    ({ collector } = await startFlow());
  });

  function event(
    name: string,
    props: WalkerOS.DeepPartialEvent = {},
  ): WalkerOS.Event {
    return getEvent(name, {
      timestamp: 1700000300000,
      source: SOURCE,
      ...props,
    });
  }

  /** The hits of a successful build, as parameter maps. */
  function params(result: BuildResult): Array<Map<string, string>> {
    if ('skip' in result) throw new Error(`unexpected skip: ${result.skip}`);
    return result.hits.map((hit) => new Map(hit));
  }

  it('builds a page view without a rule in the fixed parameter order', async () => {
    const result = await buildHits(
      {
        event: event('page view'),
        ingest: { ip: '203.0.113.9', userAgent: 'Mozilla/5.0' },
      },
      settings,
      collector,
    );

    const hit: Hit = [
      ['idsite', 'site-1'],
      ['rec', '1'],
      ['send_image', '0'],
      ['ts_n', 'walkerOS'],
      ['ts_v', __VERSION__],
      ['action_name', 'walkerOS documentation'],
      ['url', 'https://www.example.com/docs/'],
      ['cip', '203.0.113.9'],
      ['ua', 'Mozilla/5.0'],
      ['_id', await getHashServer('c00k13', 16)],
      ['uid', 'us3r'],
      ['cdt', '1700000300'],
    ];
    expect(result).toEqual({ hits: [hit] });
  });

  it('uses the rule data as page view title', async () => {
    const [hit] = params(
      await buildHits(
        {
          event: event('page view'),
          rule: { data: 'data.domain' },
          data: 'www.example.com',
        },
        settings,
        collector,
      ),
    );
    expect(hit.get('action_name')).toBe('www.example.com');
  });

  it.each<[string, WalkerOS.Event, Rule | undefined, string]>([
    ['an unmapped event', event('promotion visible'), undefined, 'unmapped'],
    [
      'an unnamed rule without a goal',
      event('promotion visible'),
      { settings: { customDimensions: { '1': 'data.name' } } },
      'unmapped',
    ],
    [
      'a method outside the table',
      event('setUserId'),
      { name: 'setUserId' },
      'unknown method setUserId',
    ],
    [
      'silent without a goal',
      event('trackEvent'),
      { name: 'trackEvent', silent: true },
      'silent',
    ],
    [
      'a missing page url',
      event('page view', { source: { type: 'collector' } }),
      undefined,
      'missing url',
    ],
  ])('skips %s', async (_, event, rule, skip) => {
    expect(await buildHits({ event, rule }, settings, collector)).toEqual({
      skip,
    });
  });

  it('skips an invalid method call with its reason', async () => {
    expect(
      await buildHits(
        { event: event('trackEvent'), rule: { name: 'trackEvent' }, data: [] },
        settings,
        collector,
      ),
    ).toEqual({ skip: 'trackEvent: category missing' });
  });

  const goalRule: Rule = {
    name: 'trackEvent',
    settings: { goalId: 'g1', goalValue: 'data.position' },
  };

  it('adds a goal hit after the method hit', async () => {
    const [main, goal] = params(
      await buildHits(
        {
          event: event('trackEvent', { data: { position: 3 } }),
          rule: goalRule,
          data: ['promotion', 'visible'],
        },
        settings,
        collector,
      ),
    );

    expect(main.get('e_c')).toBe('promotion');
    expect(goal.get('idgoal')).toBe('g1');
    expect(goal.get('revenue')).toBe('3');
    expect(goal.has('e_c')).toBe(false);
    expect(goal.get('url')).toBe('https://www.example.com/docs/');
  });

  it('sends only the goal hit for an unnamed rule with a goal', async () => {
    const hits = params(
      await buildHits(
        {
          event: event('order complete'),
          rule: { settings: { goalId: 'g1', goalValue: 'data.total' } },
        },
        settings,
        collector,
      ),
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].get('idgoal')).toBe('g1');
    expect(hits[0].get('revenue')).toBe('555');
    expect(hits[0].has('e_c')).toBe(false);
  });

  it('sends only the goal hit for a silent rule', async () => {
    const hits = params(
      await buildHits(
        {
          event: event('trackEvent', { data: { position: 3 } }),
          rule: { ...goalRule, silent: true },
        },
        settings,
        collector,
      ),
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].get('idgoal')).toBe('g1');
  });

  it('sets url to the trackLink address', async () => {
    const result = await buildHits(
      {
        event: event('trackLink'),
        rule: { name: 'trackLink' },
        data: ['https://example.com/a.pdf', 'download'],
      },
      settings,
      collector,
    );
    if ('skip' in result) throw new Error(result.skip);
    const [hit] = result.hits;
    expect(hit.filter(([key]) => key === 'url')).toEqual([
      ['url', 'https://example.com/a.pdf'],
    ]);
  });

  it('marks anonymous hits and drops the visitor and user id', async () => {
    const [hit] = params(
      await buildHits(
        { event: event('page view') },
        { ...settings, identified: false },
        collector,
      ),
    );
    expect(hit.get('uia')).toBe('1');
    expect(hit.get('dda')).toBe('1');
    expect(hit.has('_id')).toBe(false);
    expect(hit.has('uid')).toBe(false);
  });
});
