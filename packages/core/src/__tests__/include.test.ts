import type { Mapping, WalkerOS } from '../types';
import { flattenIncludeSections, getEvent, isObject } from '..';
import { createMockCollector } from './helpers/mocks';

describe('flattenIncludeSections', () => {
  const event = getEvent('order complete');

  test('flattens data section with prefix', () => {
    const result = flattenIncludeSections(event, ['data']);
    expect(result).toEqual({
      data_id: '0rd3r1d',
      data_currency: 'EUR',
      data_shipping: 5.22,
      data_taxes: 73.76,
      data_total: 555,
    });
  });

  test('flattens globals section', () => {
    const result = flattenIncludeSections(event, ['globals']);
    expect(result).toEqual({
      globals_pagegroup: 'shop',
    });
  });

  test('extracts context OrderedProperties [0] (label)', () => {
    const result = flattenIncludeSections(event, ['context']);
    // context: { shopping: ['complete', 0] } → extracts 'complete'
    expect(result).toEqual({
      context_shopping: 'complete',
    });
  });

  test('flattens event pseudo-group', () => {
    const result = flattenIncludeSections(event, ['event']);
    expect(result.event_entity).toBe('order');
    expect(result.event_action).toBe('complete');
    expect(result.event_name).toBe('order complete');
    expect(result.event_trigger).toBe('load');
    expect(result.event_timing).toBe(event.timing);
    expect(result.event_id).toBe(event.id);
    expect(result.event_timestamp).toBe(event.timestamp);
  });

  test('flattens user section', () => {
    const result = flattenIncludeSections(event, ['user']);
    expect(result).toEqual({
      user_id: 'us3r',
      user_device: 'c00k13',
      user_session: 's3ss10n',
    });
  });

  test('flattens source section', () => {
    const result = flattenIncludeSections(event, ['source']);
    expect(result.source_type).toBe('collector');
    expect(result.source_schema).toBe('4');
  });

  test('"all" expands to every section', () => {
    const result = flattenIncludeSections(event, ['all']);
    // Should contain keys from all sections
    expect(result.data_total).toBe(555);
    expect(result.globals_pagegroup).toBe('shop');
    expect(result.context_shopping).toBe('complete');
    expect(result.user_id).toBe('us3r');
    expect(result.event_name).toBe('order complete');
    expect(result.source_type).toBe('collector');
  });

  test('multiple sections combined', () => {
    const result = flattenIncludeSections(event, ['data', 'globals']);
    expect(result.data_total).toBe(555);
    expect(result.globals_pagegroup).toBe('shop');
    // No context keys
    expect(result.context_shopping).toBeUndefined();
  });

  test('skips undefined values', () => {
    const partialEvent: WalkerOS.DeepPartialEvent = {
      data: { defined: 'yes', undef: undefined },
    };
    const result = flattenIncludeSections(partialEvent, ['data']);
    expect(result).toEqual({ data_defined: 'yes' });
    expect('data_undef' in result).toBe(false);
  });

  test('empty/unknown sections return empty object', () => {
    expect(flattenIncludeSections(event, [])).toEqual({});
    expect(flattenIncludeSections(event, ['nonexistent'])).toEqual({});
  });

  test('section with non-object value is skipped', () => {
    // Test with a section that returns a non-object
    const minimal: WalkerOS.DeepPartialEvent = { name: 'test action' };
    const result = flattenIncludeSections(minimal, ['data']);
    expect(result).toEqual({});
  });
});

describe('processEventMapping with include', () => {
  const { processEventMapping } = require('..');

  const mockCollector = createMockCollector({ consent: {} });

  test('config.include flattens sections into data', async () => {
    const event = getEvent('order complete');
    const config: Mapping.Config = {
      include: ['data'],
    };

    const result = await processEventMapping(event, config, mockCollector);

    expect(isObject(result.data)).toBe(true);
    expect(result.data).toMatchObject({
      data_total: 555,
      data_currency: 'EUR',
    });
  });

  test('rule.include replaces config.include', async () => {
    const event = getEvent('order complete');
    const config: Mapping.Config = {
      include: ['data'],
      mapping: {
        order: {
          complete: {
            include: ['globals'],
          },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    // Rule-level include wins - only globals, no data
    expect(result.data).toMatchObject({ globals_pagegroup: 'shop' });
    expect(isObject(result.data) && 'data_total' in result.data).toBe(false);
  });

  test('config.data wins over include on key conflict', async () => {
    const event = getEvent('order complete');
    const config: Mapping.Config = {
      include: ['data'],
      data: {
        map: {
          data_total: { value: 'overridden' },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    expect(result.data).toMatchObject({
      data_total: 'overridden',
      // Other include keys still present
      data_currency: 'EUR',
    });
  });

  test('rule.data wins over include on key conflict', async () => {
    const event = getEvent('order complete');
    const config: Mapping.Config = {
      include: ['globals'],
      mapping: {
        order: {
          complete: {
            data: {
              map: {
                globals_pagegroup: { value: 'custom' },
              },
            },
          },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    expect(result.data).toMatchObject({ globals_pagegroup: 'custom' });
  });

  test('no include means no include data', async () => {
    const event = getEvent('order complete');
    const config: Mapping.Config = {};

    const result = await processEventMapping(event, config, mockCollector);

    expect(result.data).toBeUndefined();
  });

  test('include with context extracts OrderedProperties labels', async () => {
    const event = getEvent('order complete');
    const config: Mapping.Config = {
      include: ['context'],
    };

    const result = await processEventMapping(event, config, mockCollector);

    // context: { shopping: ['complete', 0] } → 'complete'
    expect(result.data).toMatchObject({ context_shopping: 'complete' });
  });
});
