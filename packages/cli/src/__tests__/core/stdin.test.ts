import { isStdinPiped } from '../../core/stdin.js';

describe('stdin utilities', () => {
  describe('isStdinPiped', () => {
    it('should return false when stdin is a TTY', () => {
      const original = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true,
      });
      expect(isStdinPiped()).toBe(false);
      Object.defineProperty(process.stdin, 'isTTY', {
        value: original,
        configurable: true,
      });
    });

    it('should return true when stdin is not a TTY', () => {
      const original = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', {
        value: undefined,
        configurable: true,
      });
      expect(isStdinPiped()).toBe(true);
      Object.defineProperty(process.stdin, 'isTTY', {
        value: original,
        configurable: true,
      });
    });
  });
});
