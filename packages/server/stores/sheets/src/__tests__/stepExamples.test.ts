import { examples } from '../dev';

describe('Step Examples', () => {
  it('readWithAdc has a well-formed shape', () => {
    const example = examples.step.readWithAdc;

    expect(example.title).toBe('Read with ADC');
    expect(typeof example.description).toBe('string');
    expect(example.in).toEqual(
      expect.objectContaining({ operation: 'get', key: 'alice' }),
    );
    expect(Array.isArray(example.out)).toBe(true);
  });

  it('writeWithServiceAccount has a well-formed shape', () => {
    const example = examples.step.writeWithServiceAccount;

    expect(example.title).toBe('Write with service account');
    expect(typeof example.description).toBe('string');
    expect(example.in).toEqual(
      expect.objectContaining({ operation: 'set', key: 'bob' }),
    );
    expect(Array.isArray(example.out)).toBe(true);
  });
});
