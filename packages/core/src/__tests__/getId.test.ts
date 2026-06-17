import { getId } from '../getId';

describe('getId', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses base-36 charset by default', () => {
    for (let i = 0; i < 100; i++) {
      expect(getId(8)).toMatch(/^[a-z0-9]{8}$/);
    }
  });

  it('respects length parameter', () => {
    expect(getId(5)).toHaveLength(5);
    expect(getId(12)).toHaveLength(12);
  });

  it('always returns exactly the requested length', () => {
    for (let i = 0; i < 50; i++) {
      expect(getId(16)).toHaveLength(16);
    }
  });

  it('restricts output to a custom charset', () => {
    const alpha = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < 100; i++) {
      expect(getId(5, alpha)).toMatch(/^[a-z]{5}$/);
    }
  });

  it('draws from crypto.getRandomValues when available', () => {
    const spy = jest.spyOn(globalThis.crypto, 'getRandomValues');
    const random = jest.spyOn(Math, 'random');

    const id = getId(16);

    expect(id).toHaveLength(16);
    expect(spy).toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });

  it('falls back to Math.random when crypto.getRandomValues throws', () => {
    jest.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(() => {
      throw new Error('crypto unavailable');
    });
    const random = jest.spyOn(Math, 'random');

    const id = getId(16);

    expect(id).toMatch(/^[a-z0-9]{16}$/);
    expect(random).toHaveBeenCalled();
  });

  it('generates distinct ids', () => {
    const ids = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) ids.add(getId(16));
    expect(ids.size).toBe(count);
  });
});
