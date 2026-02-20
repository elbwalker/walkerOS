import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { loadJsonConfig, substituteEnvVariables } from '../../config/index.js';
import {
  getTmpPath,
  getDefaultTmpRoot,
  createTmpResolver,
} from '../../core/tmp.js';
import { getId } from '@walkeros/core';

describe('Config utilities', () => {
  const testDir = path.join(
    os.tmpdir(),
    `config-test-${Date.now()}-${getId()}`,
  );

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

  describe('getTmpPath', () => {
    it('should return absolute tmp root when no arguments', () => {
      const tmpPath = getTmpPath();

      expect(tmpPath).toBe(os.tmpdir());
      expect(path.isAbsolute(tmpPath)).toBe(true);
    });

    it('should join path segments', () => {
      const tmpPath = getTmpPath(undefined, 'cache', 'builds');

      expect(tmpPath).toBe(path.join(os.tmpdir(), 'cache', 'builds'));
      expect(path.isAbsolute(tmpPath)).toBe(true);
    });

    it('should use custom tmp directory', () => {
      const tmpPath = getTmpPath('/custom', 'cache');

      expect(tmpPath).toBe(path.join('/custom', 'cache'));
      expect(path.isAbsolute(tmpPath)).toBe(true);
    });

    it('should return default tmp root from getDefaultTmpRoot', () => {
      expect(getDefaultTmpRoot()).toBe(os.tmpdir());
    });
  });

  describe('createTmpResolver', () => {
    it('should return a function that resolves paths with default root', () => {
      const tmp = createTmpResolver();
      expect(tmp()).toBe(os.tmpdir());
      expect(tmp('cache', 'builds')).toBe(
        path.join(os.tmpdir(), 'cache', 'builds'),
      );
    });

    it('should bake in a custom root directory', () => {
      const tmp = createTmpResolver('/custom/root');
      expect(tmp()).toBe('/custom/root');
      expect(tmp('cache')).toBe('/custom/root/cache');
      expect(tmp('cache', 'packages')).toBe('/custom/root/cache/packages');
    });

    it('should resolve relative custom root to absolute path', () => {
      const tmp = createTmpResolver('my-tmp');
      expect(tmp()).toBe(path.resolve('my-tmp'));
      expect(tmp('sub')).toBe(path.resolve('my-tmp', 'sub'));
    });
  });
});
