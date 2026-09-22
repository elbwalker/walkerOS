import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { applyCommands, resolveDimensionMap, sequence } from './dimensions';

describe('dimensions', () => {
  test('resolveDimensionMap resolves values and keeps undefined', async () => {
    const { collector } = await startFlow();

    const values = await resolveDimensionMap(
      { '1': 'data.price', '2': 'data.size', '3': 'data.missing' },
      getEvent('product view'),
      collector,
    );

    expect(values).toEqual({ '1': '420', '2': 'l', '3': undefined });
    expect(Object.keys(values)).toEqual(['1', '2', '3']);
  });

  test('resolveDimensionMap without a map is empty', async () => {
    const { collector } = await startFlow();

    expect(
      await resolveDimensionMap(undefined, getEvent('page view'), collector),
    ).toEqual({});
  });

  test('applyCommands orders by numeric id', () => {
    expect(applyCommands({ '10': 'b', '2': 'a', '3': undefined })).toEqual([
      ['setCustomDimension', 2, 'a'],
      ['deleteCustomDimension', 3],
      ['setCustomDimension', 10, 'b'],
    ]);
  });

  test('applyCommands ignores non-integer ids', () => {
    expect(applyCommands({ '1': 'a', x: 'b', '2.5': undefined })).toEqual([
      ['setCustomDimension', 1, 'a'],
    ]);
  });

  describe('sequence', () => {
    test('sets the merged map, then restores the destination map', () => {
      expect(sequence({ '1': 'x' }, { '1': 'y', '2': 'z' })).toEqual({
        before: [
          ['setCustomDimension', 1, 'y'],
          ['setCustomDimension', 2, 'z'],
        ],
        after: [
          ['deleteCustomDimension', 2],
          ['setCustomDimension', 1, 'x'],
        ],
      });
    });

    test('a destination value resolving to undefined deletes', () => {
      expect(sequence({ '1': undefined }, { '2': 'z' })).toEqual({
        before: [
          ['deleteCustomDimension', 1],
          ['setCustomDimension', 2, 'z'],
        ],
        after: [
          ['deleteCustomDimension', 2],
          ['deleteCustomDimension', 1],
        ],
      });
    });

    test('a rule key resolving to undefined deletes, then the destination value returns', () => {
      expect(sequence({ '1': 'x' }, { '1': undefined })).toEqual({
        before: [['deleteCustomDimension', 1]],
        after: [['setCustomDimension', 1, 'x']],
      });
    });

    test('a rule-only key resolving to undefined is deleted once', () => {
      expect(sequence({}, { '2': undefined })).toEqual({
        before: [['deleteCustomDimension', 2]],
        after: [],
      });
    });

    test('without rule dimensions nothing needs restoring', () => {
      expect(sequence({ '1': 'x' }, {})).toEqual({
        before: [['setCustomDimension', 1, 'x']],
        after: [],
      });
    });
  });
});
