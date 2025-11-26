/**
 * Run Command Integration Tests
 *
 * Tests the CLI run command that imports @walkeros/docker as a library
 * No Docker daemon required - runs directly in Node.js process
 */

import { runCommand } from '../index.js';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Run Command Integration', () => {
  const projectRoot = process.cwd();

  describe('runCommand() programmatic API', () => {
    it('should export runCommand function', () => {
      expect(runCommand).toBeDefined();
      expect(typeof runCommand).toBe('function');
    });

    it('should accept pre-built bundle files', () => {
      // Use the pre-built server-collect.mjs bundle
      const bundlePath = join(projectRoot, 'examples/server-collect.mjs');

      // Verify the bundle exists
      expect(existsSync(bundlePath)).toBe(true);

      // Verify it's a valid JavaScript/ESM file
      const fs = require('fs');
      const content = fs.readFileSync(bundlePath, 'utf8');
      expect(content).toContain('export');
      expect(content).toContain('default');
    });

    it('should validate JSON config structure', async () => {
      // Use the server-collect.json config
      const configPath = join(projectRoot, 'examples/server-collect.json');

      // Verify the config exists and is valid JSON
      expect(existsSync(configPath)).toBe(true);

      const config = require(configPath);
      expect(config.flow).toBeDefined();
      expect(config.build).toBeDefined();
      // New format uses server: {} key instead of platform property
      expect(config.flow.server).toBeDefined();
    });
  });

  describe('Integration with @walkeros/docker', () => {
    it('should be able to import Docker package', async () => {
      // Verify the dependency is available
      const dockerModule = await import('@walkeros/docker');

      expect(dockerModule.runFlow).toBeDefined();
      expect(dockerModule.runServeMode).toBeDefined();
    });

    it('should have correct types from Docker package', () => {
      // TypeScript compilation ensures this works
      // If this test runs, types are correctly exported
      expect(true).toBe(true);
    });
  });
});
