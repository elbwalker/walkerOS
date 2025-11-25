import fs from 'fs-extra';
import path from 'path';
import {
  loadJsonConfig,
  substituteEnvVariables,
  getTempDir,
} from '../../config/index.js';
import { getId } from '@walkeros/core';

describe('Config utilities', () => {
  const testDir = path.join('.tmp', `config-test-${Date.now()}-${getId()}`);

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('loadJsonConfig', () => {
    it('should load valid JSON config', async () => {
      const configPath = path.join(testDir, 'valid.json');
      const config = { test: 'value', nested: { key: 'data' } };

      await fs.writeJson(configPath, config);

      const result = await loadJsonConfig(configPath);

      expect(result).toEqual(config);
    });

    it('should throw error for missing file', async () => {
      const configPath = path.join(testDir, 'missing.json');

      await expect(loadJsonConfig(configPath)).rejects.toThrow(
        'Configuration file not found',
      );
    });

    it('should throw error for invalid JSON', async () => {
      const configPath = path.join(testDir, 'invalid.json');

      await fs.writeFile(configPath, '{ invalid json }');

      await expect(loadJsonConfig(configPath)).rejects.toThrow(
        'Invalid JSON in config file',
      );
    });
  });

  describe('substituteEnvVariables', () => {
    it('should substitute environment variables', () => {
      process.env.TEST_VAR = 'test-value';

      const result = substituteEnvVariables('Hello ${TEST_VAR}!');

      expect(result).toBe('Hello test-value!');

      delete process.env.TEST_VAR;
    });

    it('should substitute multiple variables', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';

      const result = substituteEnvVariables('${VAR1} and ${VAR2}');

      expect(result).toBe('value1 and value2');

      delete process.env.VAR1;
      delete process.env.VAR2;
    });

    it('should throw error for missing environment variable', () => {
      expect(() => {
        substituteEnvVariables('${MISSING_VAR}');
      }).toThrow('Environment variable MISSING_VAR not found');
    });

    it('should return unchanged string if no variables', () => {
      const input = 'no variables here';
      const result = substituteEnvVariables(input);

      expect(result).toBe(input);
    });
  });

  describe('getTempDir', () => {
    it('should generate unique temp directory', () => {
      const dir1 = getTempDir();
      const dir2 = getTempDir();

      expect(dir1).not.toBe(dir2);
      expect(dir1).toContain('cli-');
      expect(dir2).toContain('cli-');
    });

    it('should use custom temp directory name', () => {
      const customDir = getTempDir('custom-temp');

      expect(customDir).toContain('custom-temp');
      expect(customDir).toContain('cli-');
    });
  });
});
