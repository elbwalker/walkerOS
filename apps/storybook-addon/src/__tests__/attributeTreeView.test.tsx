import { originLabel } from '../components/origin-chip';

describe('originLabel', () => {
  test('generic -> generic, scoped -> scoped, data -> empty', () => {
    expect(originLabel('generic')).toBe('generic');
    expect(originLabel('scoped')).toBe('scoped');
    expect(originLabel('data')).toBe('');
  });
});
