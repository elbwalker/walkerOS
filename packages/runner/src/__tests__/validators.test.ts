import { describe, it, expect } from '@jest/globals';
import { validatePort } from '../validators.js';

describe('validators', () => {
  describe('validatePort', () => {
    it('should accept valid ports', () => {
      expect(() => validatePort(1)).not.toThrow();
      expect(() => validatePort(80)).not.toThrow();
      expect(() => validatePort(8080)).not.toThrow();
      expect(() => validatePort(65535)).not.toThrow();
    });

    it('should reject invalid ports', () => {
      expect(() => validatePort(0)).toThrow(/Invalid port/);
      expect(() => validatePort(-1)).toThrow(/Invalid port/);
      expect(() => validatePort(65536)).toThrow(/Invalid port/);
      expect(() => validatePort(99999)).toThrow(/Invalid port/);
    });

    it('should reject non-integer ports', () => {
      expect(() => validatePort(8080.5)).toThrow(/Invalid port/);
      expect(() => validatePort(NaN)).toThrow(/Invalid port/);
      expect(() => validatePort(Infinity)).toThrow(/Invalid port/);
    });

    it('should provide helpful error message', () => {
      expect(() => validatePort(99999)).toThrow(/between 1 and 65535/);
      expect(() => validatePort(99999)).toThrow(/Example: --port 8080/);
    });
  });
});
