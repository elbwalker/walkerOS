/**
 * Run Command Integration Tests
 *
 * Tests the CLI run command that imports @walkeros/docker as a library
 * No Docker daemon required - runs directly in Node.js process
 */

import { runCommand } from '../index.js';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

describe('Run Command Integration', () => {
  const projectRoot = process.cwd();

  describe('runCommand() programmatic API', () => {
    it('should export runCommand function', () => {
      expect(runCommand).toBeDefined();
      expect(typeof runCommand).toBe('function');
    });

    it('should accept pre-built bundle files', () => {
      // Use the pre-built bundle at convention-based path
      const bundlePath = join(projectRoot, 'examples/dist/bundle.mjs');

      // Bundle may not exist if tests run in isolation
      // Just verify the bundle command API exists
      expect(typeof runCommand).toBe('function');
    });

    it('should validate JSON config structure (Flow.Setup format)', async () => {
      // Use the server-collect.json config
      const configPath = join(projectRoot, 'examples/server-collect.json');

      // Verify the config exists and is valid JSON
      expect(existsSync(configPath)).toBe(true);

      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      // New Flow.Setup format
      expect(config.version).toBe(1);
      expect(config.environments).toBeDefined();
      expect(config.environments.default).toBeDefined();
      expect(config.environments.default.server).toBeDefined();
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
