import {
  eventAction,
  eventContext,
  eventEntity,
  eventGlobals,
  eventProperty,
} from '@walkeros/explorer/design';
import { originLabel } from '../components/origin-chip';
import { attributeColors, type AttributeKind } from '../utils/eventColors';

describe('originLabel', () => {
  test('generic -> generic, scoped -> scoped, data -> empty', () => {
    expect(originLabel('generic')).toBe('generic');
    expect(originLabel('scoped')).toBe('scoped');
    expect(originLabel('data')).toBe('');
  });
});

describe('attribute badge colours', () => {
  const cases: Array<[AttributeKind, string]> = [
    ['entity', eventEntity],
    ['action', eventAction],
    ['context', eventContext],
    ['globals', eventGlobals],
    ['data', eventProperty],
  ];

  it.each(cases)('%s uses its design event colour', (kind, colour) => {
    expect(attributeColors[kind]).toBe(colour);
  });
});
