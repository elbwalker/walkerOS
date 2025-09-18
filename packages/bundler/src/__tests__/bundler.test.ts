import fs from 'fs-extra';
import path from 'path';
import { bundle } from '../bundler';
import { parseConfig } from '../config';
import { getId } from '@walkeros/core';

describe('Bundler', () => {
  const testOutputDir = path.join('.tmp', `bundler-${Date.now()}-${getId()}`);

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
    // Mock console.log to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up test output
    await fs.remove(testOutputDir);
    // Restore console.log
    jest.restoreAllMocks();
  });

  it('should bundle minimal config successfully', async () => {
    // Read the minimal config example
    const configPath = path.join('examples', 'minimal.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(bundle(config)).resolves.not.toThrow();
  });

  it('should bundle node config with CJS format', async () => {
    // Read the node config example
    const configPath = path.join('examples', 'node.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(bundle(config)).resolves.not.toThrow();
  });

  it('should bundle advanced config with minification', async () => {
    // Read the advanced config example
    const configPath = path.join('examples', 'advanced.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(bundle(config)).resolves.not.toThrow();
  });

  describe('Stats Collection', () => {
    it('should collect bundle stats when requested', async () => {
      const configPath = path.join('examples', 'minimal.config.json');
      const rawConfig = await fs.readJson(configPath);
      rawConfig.output.dir = testOutputDir;
      const config = parseConfig(rawConfig);

      const stats = await bundle(config, true);

      expect(stats).toBeDefined();
      expect(stats!.totalSize).toBeGreaterThan(0);
      expect(stats!.buildTime).toBeGreaterThan(0);
      expect(stats!.treeshakingEffective).toBe(true);
      expect(stats!.packages).toHaveLength(1);
      expect(stats!.packages[0].name).toBe('@walkeros/core@latest');
    });

    it('should detect ineffective tree-shaking with wildcard imports', async () => {
      const config = parseConfig({
        packages: [{ name: '@walkeros/core', version: 'latest' }],
        content:
          'import * as walkerCore from "@walkeros/core";\nexport const test = walkerCore.getId;',
        output: { dir: testOutputDir, filename: 'test.js' },
      });

      const stats = await bundle(config, true);

      expect(stats!.treeshakingEffective).toBe(false);
    });

    it('should return undefined when stats not requested', async () => {
      const configPath = path.join('examples', 'minimal.config.json');
      const rawConfig = await fs.readJson(configPath);
      rawConfig.output.dir = testOutputDir;
      const config = parseConfig(rawConfig);

      const result = await bundle(config, false);

      expect(result).toBeUndefined();
    });
  });

  describe('Template System', () => {
    it('should apply inline template correctly', async () => {
      const config = parseConfig({
        packages: [{ name: '@walkeros/core', version: 'latest' }],
        content:
          'import { getId } from "@walkeros/core";\nexport const generateId = () => getId(8);',
        template: {
          content:
            '// {{NAME}} v{{VERSION}}\n{{CONTENT}}\nexport default { name: "{{NAME}}" };',
          variables: { NAME: 'TestLib', VERSION: '1.0.0' },
        },
        output: { dir: testOutputDir, filename: 'template-test.js' },
      });

      await expect(bundle(config)).resolves.not.toThrow();
    });

    it('should handle missing template variables gracefully', async () => {
      const config = parseConfig({
        packages: [{ name: '@walkeros/core', version: 'latest' }],
        content:
          'import { trim } from "@walkeros/core"; export const test = trim("hello");',
        template: {
          content: '{{CONTENT}}\n// {{MISSING_VAR}} should remain as-is',
          variables: { OTHER_VAR: 'exists' },
        },
        output: { dir: testOutputDir, filename: 'missing-vars.js' },
      });

      await expect(bundle(config)).resolves.not.toThrow();
    });

    it('should append bundle code when placeholder not found', async () => {
      const config = parseConfig({
        packages: [{ name: '@walkeros/core', version: 'latest' }],
        content:
          'import { getId } from "@walkeros/core"; export const test = getId(6);',
        template: {
          content: '// Header only template',
        },
        output: { dir: testOutputDir, filename: 'append-test.js' },
      });

      await expect(bundle(config)).resolves.not.toThrow();
    });
  });

  describe('Version Resolution', () => {
    let versionTestDir: string;

    beforeAll(() => {
      const randomId = Math.random().toString(36).substring(2, 11);
      versionTestDir = path.join(
        '.tmp',
        `version-test-${Date.now()}-${randomId}`,
      );
    });

    afterAll(async () => {
      await fs.remove(versionTestDir).catch(() => {});
    });

    it('should bundle with specific version and verify version in output', async () => {
      // Use CLI approach since Jest mocking interferes with direct bundle() calls
      const configContent = {
        packages: [
          { name: '@walkeros/core', version: '0.0.7' },
          { name: '@walkeros/collector', version: '0.0.7' },
        ],
        content: "import { createCollector } from '@walkeros/collector';",
        template: {
          content:
            '{{CONTENT}}\n\n// Assign to window.old to test version resolution\nwindow.old = { createCollector };',
        },
        build: {
          platform: 'browser',
          format: 'iife',
          target: 'es2020',
        },
        output: {
          filename: 'version-test.js',
          dir: versionTestDir,
        },
      };

      const tempConfigPath = path.join(versionTestDir, 'test.config.json');
      await fs.ensureDir(versionTestDir);
      await fs.writeJson(tempConfigPath, configContent);

      // Run CLI command (only reliable way to bypass Jest mocking issues)
      const { execSync } = require('child_process');
      execSync(`npm run dev -- --config ${tempConfigPath}`, {
        cwd: process.cwd(),
        stdio: 'pipe',
      });

      // Verify the bundled file contains version "0.0.7"
      const outputPath = path.join(versionTestDir, 'version-test.js');
      expect(await fs.pathExists(outputPath)).toBe(true);

      const bundledContent = await fs.readFile(outputPath, 'utf-8');
      expect(bundledContent).toContain('0.0.7');
      expect(bundledContent).toContain('window.old');
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors in content', async () => {
      const config = parseConfig({
        packages: [{ name: '@walkeros/core', version: 'latest' }],
        content:
          'import { getId } from "@walkeros/core";\n\nexport const badCode = () => {\n  return getId([1,2,3] x => x * 2);\n};',
        output: { dir: testOutputDir, filename: 'error-test.js' },
      });

      await expect(bundle(config, false, true)).rejects.toThrow(); // silent = true
    });

    it('should handle missing package imports', async () => {
      const config = parseConfig({
        packages: [{ name: '@walkeros/core', version: 'latest' }],
        content: 'import { nonExistentFunction } from "@walkeros/nonexistent";',
        output: { dir: testOutputDir, filename: 'error-test.js' },
      });

      await expect(bundle(config, false, true)).rejects.toThrow(); // silent = true
    });
  });
});
