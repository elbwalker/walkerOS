import fs from 'fs-extra';
import path from 'path';
import { bundle } from '../bundler';
import { parseConfig } from '../config';

// Mock the package manager to avoid external dependencies in tests
jest.mock('../package-manager', () => ({
  downloadPackages: jest.fn().mockResolvedValue(
    new Map([
      ['lodash-es', '/mocked/node_modules/lodash-es'],
      ['dayjs', '/mocked/node_modules/dayjs'],
    ]),
  ),
}));

// Mock esbuild to avoid actual bundling in tests
jest.mock('esbuild', () => ({
  build: jest.fn().mockResolvedValue({}),
}));

describe('Bundler', () => {
  const testOutputDir = 'test-output';

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
  });

  afterEach(async () => {
    // Clean up test output
    await fs.remove(testOutputDir);
  });

  it('should bundle minimal config successfully', async () => {
    // Read the minimal config example
    const configPath = path.join('examples', 'minimal.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler (mocked dependencies should complete without error)
    await expect(bundle(config)).resolves.not.toThrow();
  });

  it('should bundle node config with CJS format', async () => {
    // Read the node config example
    const configPath = path.join('examples', 'node.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler (mocked dependencies should complete without error)
    await expect(bundle(config)).resolves.not.toThrow();
  });

  it('should bundle advanced config with minification', async () => {
    // Read the advanced config example
    const configPath = path.join('examples', 'advanced.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler (mocked dependencies should complete without error)
    await expect(bundle(config)).resolves.not.toThrow();
  });
});
