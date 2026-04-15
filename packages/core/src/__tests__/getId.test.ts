import { getId } from '../getId';

describe('getId', () => {
  it('uses base-36 charset by default', () => {
    for (let i = 0; i < 100; i++) {
      expect(getId(8)).toMatch(/^[a-z0-9]{8}$/);
    }
  });

  it('respects length parameter', () => {
    expect(getId(5)).toHaveLength(5);
    expect(getId(12)).toHaveLength(12);
  });

  it('restricts output to a custom charset', () => {
    const alpha = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < 100; i++) {
      expect(getId(5, alpha)).toMatch(/^[a-z]{5}$/);
    }
  });
});
