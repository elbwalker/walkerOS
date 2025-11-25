import { describe, it, expect } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { validateMode, validateFlowFile, validatePort } from '../validators.js';

describe('validators', () => {
  describe('validateMode', () => {
    it('should accept valid modes', () => {
      expect(() => validateMode('collect')).not.toThrow();
      expect(() => validateMode('serve')).not.toThrow();
    });

    it('should reject invalid modes', () => {
      expect(() => validateMode('invalid')).toThrow(/Invalid mode/);
      expect(() => validateMode('bundle')).toThrow(/Invalid mode/);
      expect(() => validateMode('COLLECT')).toThrow(/Invalid mode/);
      expect(() => validateMode('')).toThrow(/Invalid mode/);
    });

    it('should provide helpful error message', () => {
      expect(() => validateMode('invalid')).toThrow(
        /Valid modes: collect, serve/,
      );
      expect(() => validateMode('invalid')).toThrow(/Example:/);
    });
  });

  describe('validateFlowFile', () => {
    const testDir = join(process.cwd(), '.test-tmp-validators');
    const testFile = join(testDir, 'test-flow.json');

    beforeEach(() => {
      // Create test directory and file
      mkdirSync(testDir, { recursive: true });
      writeFileSync(testFile, '{}');
    });

    afterEach(() => {
      // Cleanup
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should accept existing file', () => {
      const result = validateFlowFile(testFile);
      expect(result).toBe(testFile);
    });

    it('should accept relative path', () => {
      const relativePath = '.test-tmp-validators/test-flow.json';
      const result = validateFlowFile(relativePath);
      expect(result).toContain('test-flow.json');
      expect(result).not.toBe(relativePath); // Should be absolute
    });

    it('should return absolute path', () => {
      const result = validateFlowFile(testFile);
      expect(result).toMatch(/^[/\\]/); // Starts with / or \
    });

    it('should reject non-existent file', () => {
      expect(() => validateFlowFile('./missing.json')).toThrow(
        /Flow file not found/,
      );
    });

    it('should provide helpful error message', () => {
      expect(() => validateFlowFile('./missing.json')).toThrow(
        /Resolved path:/,
      );
      expect(() => validateFlowFile('./missing.json')).toThrow(
        /Make sure the file exists/,
      );
    });
  });

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
