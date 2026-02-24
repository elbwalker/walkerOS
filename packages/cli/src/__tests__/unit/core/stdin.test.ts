import { isStdinPiped } from '../../../core/stdin.js';

describe('stdin utilities', () => {
  describe('isStdinPiped', () => {
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalIsTTY = process.stdin.isTTY;
    });

    afterEach(() => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    });

    it('should return false when stdin is a TTY', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true,
      });
      expect(isStdinPiped()).toBe(false);
    });

    it('should return true when stdin is not a TTY', () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: undefined,
        configurable: true,
      });
      expect(isStdinPiped()).toBe(true);
    });
  });
});
