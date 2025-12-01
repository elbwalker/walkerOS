/**
 * Integration Test: Server Platform Simulation
 */

import path from 'path';
import fs from 'fs-extra';
import { executeSimulation } from '../../commands/simulate/simulator';

const projectRoot = process.cwd();

describe('Server Simulation Integration', () => {
  const testConfigDir = path.join(projectRoot, '.tmp/server-simulate-test');
  const testConfigPath = path.join(testConfigDir, 'server-config.json');

  beforeAll(async () => {
    await fs.ensureDir(testConfigDir);

    const serverConfig = {
      version: 1,
      flows: {
        default: {
          server: {},
          packages: {
            '@walkeros/collector': {
              version: 'latest',
              imports: ['startFlow'],
            },
            '@walkeros/destination-demo': {
              version: 'latest',
              imports: ['destinationDemo'],
            },
          },
          destinations: {
            demo: {
              package: '@walkeros/destination-demo',
              config: { settings: { name: 'Test', values: ['name'] } },
            },
          },
        },
      },
    };

    await fs.writeJSON(testConfigPath, serverConfig, { spaces: 2 });
  });

  afterAll(async () => {
    await fs.remove(testConfigDir).catch(() => {});
  });

  it('should execute server simulation successfully', async () => {
    const event = { name: 'page view', data: { title: 'Test' } };

    // Debug: Check if config exists
    const configExists = await fs.pathExists(testConfigPath);
    console.log('Config exists:', configExists);
    if (configExists) {
      const configContent = await fs.readJSON(testConfigPath);
      console.log('Config content:', JSON.stringify(configContent, null, 2));
    }

    const result = await executeSimulation(event, testConfigPath);

    if (!result.success) {
      console.error('Simulation failed with error:', result.error);
    }

    expect(result.success).toBe(true);
    expect(result.elbResult).toBeDefined();
  }, 60000);
});
