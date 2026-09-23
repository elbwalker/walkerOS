import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import {
  applyCommands,
  resolveDimensionMap,
  sequence,
  toDimensionsArgument,
} from '../dimensions';

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

  describe('toDimensionsArgument', () => {
    test('encodes values with rule over destination', () => {
      expect(
        toDimensionsArgument(
          { '1': 'a b', '2': 'x', '3': 'kept' },
          { '2': 'y', '4': 'ü' },
          undefined,
        ),
      ).toEqual({
        dimension1: 'a%20b',
        dimension2: 'y',
        dimension3: 'kept',
        dimension4: '%C3%BC',
      });
    });

    test('the argument wins and passes as is', () => {
      expect(
        toDimensionsArgument(
          { '1': 'a b' },
          { '2': 'y' },
          { dimension1: 'own value', dimension5: 5, other: 'ignored' },
        ),
      ).toEqual({ dimension1: 'own value', dimension2: 'y', dimension5: '5' });
    });

    test('a value that cannot be encoded is dropped', () => {
      expect(
        toDimensionsArgument({ '1': '\uD800', '2': 'ok' }, {}, undefined),
      ).toEqual({ dimension2: 'ok' });
    });

    test('non-integer ids are ignored', () => {
      expect(
        toDimensionsArgument({ '1': 'a', x: 'b', '1.5': 'c' }, {}, undefined),
      ).toEqual({ dimension1: 'a' });
    });

    test('a rule key resolving to undefined wins and is left out', () => {
      expect(
        toDimensionsArgument({ '1': 'x' }, { '1': undefined }, undefined),
      ).toEqual({});
    });
  });

  test('a rule key resolving to undefined never falls back to the destination value', async () => {
    const { collector } = await startFlow();
    const event = getEvent('page view');
    const destination = await resolveDimensionMap(
      { '1': { value: 'docs' } },
      event,
      collector,
    );
    const rule = await resolveDimensionMap(
      { '1': 'data.missing' },
      event,
      collector,
    );

    expect(toDimensionsArgument(destination, rule, undefined)).toEqual({});
    expect(sequence(destination, rule)).toEqual({
      before: [['deleteCustomDimension', 1]],
      after: [['setCustomDimensionValue', 1, 'docs']],
    });
  });

  test('applyCommands orders by numeric id', () => {
    expect(applyCommands({ '10': 'b', '2': 'a', '3': undefined })).toEqual([
      ['setCustomDimensionValue', 2, 'a'],
      ['deleteCustomDimension', 3],
      ['setCustomDimensionValue', 10, 'b'],
    ]);
  });

  test('applyCommands ignores non-integer ids', () => {
    expect(applyCommands({ '1': 'a', x: 'b', '2.5': undefined })).toEqual([
      ['setCustomDimensionValue', 1, 'a'],
    ]);
  });

  describe('sequence', () => {
    test('sets the merged map, then restores the destination map', () => {
      expect(sequence({ '1': 'x' }, { '1': 'y', '2': 'z' })).toEqual({
        before: [
          ['setCustomDimensionValue', 1, 'y'],
          ['setCustomDimensionValue', 2, 'z'],
        ],
        after: [
          ['deleteCustomDimension', 2],
          ['setCustomDimensionValue', 1, 'x'],
        ],
      });
    });

    test('a destination value resolving to undefined deletes', () => {
      expect(sequence({ '1': undefined }, { '2': 'z' })).toEqual({
        before: [
          ['deleteCustomDimension', 1],
          ['setCustomDimensionValue', 2, 'z'],
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
        after: [['setCustomDimensionValue', 1, 'x']],
      });
    });

    test('a rule-only key resolving to undefined is deleted once', () => {
      expect(sequence({}, { '2': undefined })).toEqual({
        before: [['deleteCustomDimension', 2]],
        after: [],
      });
    });

    test('values are raw, not encoded', () => {
      expect(sequence({}, { '1': 'a b' }).before).toEqual([
        ['setCustomDimensionValue', 1, 'a b'],
      ]);
    });

    test('without rule dimensions nothing needs restoring', () => {
      expect(sequence({ '1': 'x' }, {})).toEqual({
        before: [['setCustomDimensionValue', 1, 'x']],
        after: [],
      });
    });
  });
});
