import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {
  loadConfig,
  loadJsonConfig,
  substituteEnvVariables,
} from '../../../config/index.js';
import {
  getTmpPath,
  getDefaultTmpRoot,
  createTmpResolver,
} from '../../../core/tmp.js';
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

    it('parses inline JSON object strings', async () => {
      const json = '{"version":3,"flows":{"default":{"web":{}}}}';
      const result = await loadJsonConfig(json);
      expect(result).toEqual({ version: 3, flows: { default: { web: {} } } });
    });

    it('parses inline JSON with whitespace', async () => {
      const json = '  { "version": 3 }  ';
      const result = await loadJsonConfig(json);
      expect(result).toEqual({ version: 3 });
    });

    it('throws helpful error for malformed JSON-like strings', async () => {
      await expect(loadJsonConfig('{ broken json')).rejects.toThrow(
        /appears to be JSON/,
      );
    });

    it('throws for non-existent file paths', async () => {
      await expect(
        loadJsonConfig('/tmp/does-not-exist-xyz.json'),
      ).rejects.toThrow(/not found/);
    });

    it('parses inline JSON arrays', async () => {
      const json = '[{"name":"test"}]';
      const result = await loadJsonConfig(json);
      expect(result).toEqual([{ name: 'test' }]);
    });
  });

  describe('loadConfig', () => {
    it('json: true (default) with file path returns parsed object', async () => {
      const configPath = path.join(testDir, 'config.json');
      const config = { version: 3, flows: {} };

      await fs.writeJson(configPath, config);

      const result = await loadConfig(configPath);

      expect(result).toEqual(config);
    });

    it('json: true with inline JSON string returns parsed object', async () => {
      const json = '{"version":3,"flows":{"default":{"web":{}}}}';
      const result = await loadConfig(json);
      expect(result).toEqual({ version: 3, flows: { default: { web: {} } } });
    });

    it('json: true with explicit option parses JSON', async () => {
      const json = '{"key":"value"}';
      const result = await loadConfig(json, { json: true });
      expect(result).toEqual({ key: 'value' });
    });

    it('json: false with file path returns raw string', async () => {
      const filePath = path.join(testDir, 'bundle.js');
      const content = 'const x = 42;\nexport default x;';

      await fs.writeFile(filePath, content);

      const result = await loadConfig(filePath, { json: false });

      expect(result).toBe(content);
    });

    it('json: false with inline content returns raw string', async () => {
      const content = '{"version":3}';
      const result = await loadConfig(content, { json: false });
      expect(result).toBe(content);
    });

    it('json: false with non-JSON file returns raw string', async () => {
      const filePath = path.join(testDir, 'code.js');
      const jsCode = 'function hello() { return "world"; }';

      await fs.writeFile(filePath, jsCode);

      const result = await loadConfig(filePath, { json: false });

      expect(result).toBe(jsCode);
    });

    it('throws for invalid JSON with json: true', async () => {
      const filePath = path.join(testDir, 'bad.json');
      await fs.writeFile(filePath, '{ invalid json }');

      await expect(loadConfig(filePath)).rejects.toThrow(
        'Invalid JSON in config file',
      );
    });

    it('throws for inline invalid JSON with json: true', async () => {
      await expect(loadConfig('{ broken json')).rejects.toThrow(
        /appears to be JSON/,
      );
    });

    it('throws for non-existent file', async () => {
      await expect(loadConfig('/tmp/does-not-exist-xyz.json')).rejects.toThrow(
        /not found/,
      );
    });

    it('throws for non-existent file with json: false', async () => {
      await expect(
        loadConfig('/tmp/does-not-exist-xyz.js', { json: false }),
      ).rejects.toThrow(/not found/);
    });
  });

  describe('loadJsonConfig backward compat', () => {
    it('still works identically via loadConfig', async () => {
      const configPath = path.join(testDir, 'compat.json');
      const config = { compat: true, nested: { a: 1 } };

      await fs.writeJson(configPath, config);

      const viaLoadConfig = await loadConfig(configPath);
      const viaLoadJsonConfig = await loadJsonConfig(configPath);

      expect(viaLoadConfig).toEqual(viaLoadJsonConfig);
      expect(viaLoadJsonConfig).toEqual(config);
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
