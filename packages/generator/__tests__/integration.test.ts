import { generateWalkerOSBundle } from '../src/index';
import type { GeneratorInput } from '../src/types';
import type { Flow } from '@walkeros/core';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock the exec function and filesystem to simulate npm commands
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('util', () => ({
  promisify: jest.fn((fn) => {
    // Return a simplified promisified version that directly uses the mocked fn
    return fn;
  }),
}));
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  rmSync: jest.fn(),
  mkdtempSync: jest.fn(),
}));

const { exec: mockExec } = require('child_process');
const fs = require('fs');

// Mock package code samples (what would be extracted from real packages)
const mockPackageCode = {
  '@walkeros/core': `
const assign = Object.assign;
const isString = (value) => typeof value === 'string';
const isObject = (value) => value && typeof value === 'object';
const createSource = (source, config) => ({ source, config });
`,
  '@walkeros/collector': `
const createCollector = async (config) => {
  const collector = { sources: {}, destinations: {} };
  const elb = (event, data) => console.log('Event:', event, data);
  return { collector, elb };
};
`,
  '@walkeros/web-source-browser': `
const sourceBrowser = {
  init: (config) => ({ elb: (event, data) => console.log('Browser:', event, data) })
};
`,
  '@walkeros/web-destination-gtag': `
const destinationGtag = {
  push: (event, context) => {
    if (typeof gtag !== 'undefined') {
      gtag('event', event.event, event.data);
    }
  }
};
`,
};

describe('WalkerOS Generator Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock npm view command to return package metadata
    mockExec.mockImplementation(async (command: string, options?: any) => {
      if (command.includes('npm view')) {
        // Better parsing of package name from command
        const parts = command.split(' ');
        const packageSpec = parts[2]; // e.g., "@walkeros/core@0.0.8"
        const packageName = packageSpec.includes('@', 1)
          ? packageSpec.substring(0, packageSpec.lastIndexOf('@'))
          : packageSpec;

        const mockMetadata = {
          name: packageName,
          version: '0.0.8',
          dist: {
            tarball: `https://registry.npmjs.org/${packageName}/-/${packageName}-0.0.8.tgz`,
            shasum: 'mock-shasum',
          },
          main: 'dist/index.js',
        };
        return { stdout: JSON.stringify(mockMetadata), stderr: '' };
      } else if (command.includes('npm install')) {
        // Mock successful npm install
        return { stdout: 'npm install completed', stderr: '' };
      } else {
        throw new Error(`Unmocked command: ${command}`);
      }
    });

    // Mock filesystem operations
    fs.existsSync = jest.fn().mockImplementation((path: string) => {
      // Mock that package directories exist after installation
      if (path.includes('node_modules')) return true;
      if (path.includes('dist/index.js')) return true;
      if (path.includes('package.json')) return true; // Allow temp package.json creation
      return false;
    });

    fs.readFileSync = jest.fn().mockImplementation((path: string) => {
      // Return appropriate mock code based on package path
      for (const [packageName, code] of Object.entries(mockPackageCode)) {
        if (
          path.includes(
            packageName.replace('/', path.includes('\\') ? '\\' : '/'),
          )
        ) {
          return code;
        }
      }
      // Special handling for the entry point matching
      if (path.includes('dist/index.js')) {
        // Determine which package this is from the path
        if (path.includes('@walkeros')) {
          const packageMatch = path.match(/@walkeros\/[^\/\\]+/);
          if (packageMatch) {
            const packageName = packageMatch[0];
            if (mockPackageCode[packageName]) {
              return mockPackageCode[packageName];
            }
          }
        }
      }
      return 'mock file content';
    });

    fs.mkdirSync = jest.fn();
    fs.writeFileSync = jest.fn();
    fs.rmSync = jest.fn();
    fs.mkdtempSync = jest.fn().mockReturnValue('/tmp/mock-temp-dir');
  });

  const simpleFlowConfig: Flow.Config = {
    packages: [
      { name: '@walkeros/core', version: '0.0.8', type: 'core' },
      { name: '@walkeros/collector', version: '0.0.8', type: 'collector' },
      {
        name: '@walkeros/web-source-browser',
        version: '0.0.9',
        type: 'source',
      },
      {
        name: '@walkeros/web-destination-gtag',
        version: '0.0.8',
        type: 'destination',
      },
    ],
    nodes: [
      {
        id: 'browser-source',
        type: 'source',
        package: '@walkeros/web-source-browser',
        config: {
          domain: 'example.com',
          autoTracking: true,
        },
      },
      {
        id: 'collector',
        type: 'collector',
        package: '@walkeros/collector',
        config: {
          consent: {
            functional: true,
            marketing: false,
          },
          queue: true,
        },
      },
      {
        id: 'gtag-destination',
        type: 'destination',
        package: '@walkeros/web-destination-gtag',
        config: {
          measurementId: 'G-XXXXXXXXXX',
        },
      },
    ],
    edges: [
      {
        id: 'browser-to-collector',
        source: 'browser-source',
        target: 'collector',
      },
      {
        id: 'collector-to-gtag',
        source: 'collector',
        target: 'gtag-destination',
      },
    ],
  };

  it('should generate a functional IIFE bundle from simple Flow config', async () => {
    const input: GeneratorInput = {
      flow: simpleFlowConfig,
    };

    const result = await generateWalkerOSBundle(input);

    // Verify basic structure
    expect(result).toHaveProperty('bundle');
    expect(typeof result.bundle).toBe('string');
    expect(result.bundle.length).toBeGreaterThan(0);

    // Verify IIFE wrapper (after comment block)
    expect(result.bundle).toContain('(function(window) {');
    expect(result.bundle).toMatch(/\}\)\(typeof window/);

    // Verify package comments are included
    expect(result.bundle).toContain('// @walkeros/core@0.0.8 (core)');
    expect(result.bundle).toContain('// @walkeros/collector@0.0.8 (collector)');
    expect(result.bundle).toContain(
      '// @walkeros/web-source-browser@0.0.9 (source)',
    );
    expect(result.bundle).toContain(
      '// @walkeros/web-destination-gtag@0.0.8 (destination)',
    );

    // Verify real package code is included (no fallback comments)
    expect(result.bundle).not.toContain('FALLBACK:');
    expect(result.bundle).not.toContain('Mock @walkeros');

    // Verify actual package code is present
    expect(result.bundle).toContain('assign');
    expect(result.bundle).toContain('createCollector');
    expect(result.bundle).toContain('sourceBrowser');

    // Verify initialization code
    expect(result.bundle).toContain('async function initWalkerOS()');
    expect(result.bundle).toContain('window.walkerOS');
    expect(result.bundle).toContain('window.elb');

    // Verify collector configuration includes our nodes
    expect(result.bundle).toContain('browser-source');
    expect(result.bundle).toContain('gtag-destination');
    expect(result.bundle).toContain('G-XXXXXXXXXX');
  });

  it('should fail with helpful error when packages cannot be resolved', async () => {
    // Override mock to simulate npm command failure
    mockExec.mockImplementation(async (command: string, options?: any) => {
      if (command.includes('npm view @walkeros/nonexistent')) {
        throw new Error(
          'npm ERR! 404 Not Found - GET https://registry.npmjs.org/@walkeros%2fnonexistent',
        );
      } else {
        // Other packages succeed
        const parts = command.split(' ');
        const packageSpec = parts[2];
        const packageName = packageSpec.includes('@', 1)
          ? packageSpec.substring(0, packageSpec.lastIndexOf('@'))
          : packageSpec;
        const mockMetadata = {
          name: packageName,
          version: '0.0.8',
          dist: {
            tarball: `https://registry.npmjs.org/${packageName}/-/${packageName}-0.0.8.tgz`,
            shasum: 'mock',
          },
          main: 'dist/index.js',
        };
        return { stdout: JSON.stringify(mockMetadata), stderr: '' };
      }
    });

    const configWithBadPackage: Flow.Config = {
      ...simpleFlowConfig,
      packages: [
        { name: '@walkeros/nonexistent', version: '1.0.0', type: 'core' },
      ],
    };

    const input: GeneratorInput = { flow: configWithBadPackage };

    await expect(generateWalkerOSBundle(input)).rejects.toThrow(
      /Failed to resolve package @walkeros\/nonexistent@1.0.0/,
    );
    await expect(generateWalkerOSBundle(input)).rejects.toThrow(
      /Troubleshooting suggestions/,
    );
  });

  it('should fail when package has no valid entry point', async () => {
    // Mock package that exists but has no valid entry point
    fs.existsSync = jest.fn().mockImplementation((path: string) => {
      if (path.includes('node_modules')) return true;
      if (path.includes('package.json')) return true; // Allow temp package.json creation
      // No valid entry points exist
      return false;
    });

    // Mock successful npm install but failed file reading for entry points
    fs.readFileSync = jest.fn().mockImplementation((path: string) => {
      // Allow package.json reads for temp directory setup
      if (path.includes('package.json')) {
        return '{"name": "temp"}';
      }
      // Fail all entry point reads
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    });

    const input: GeneratorInput = { flow: simpleFlowConfig };

    await expect(generateWalkerOSBundle(input)).rejects.toThrow(
      /Failed to install\/extract/,
    );
  }, 30000);

  it('should validate Flow config structure', async () => {
    const invalidInput: GeneratorInput = {
      flow: {} as Flow.Config,
    };

    await expect(generateWalkerOSBundle(invalidInput)).rejects.toThrow();
  });

  it('should validate package configurations', async () => {
    const invalidPackageConfig: Flow.Config = {
      ...simpleFlowConfig,
      packages: [{ name: '', version: '1.0.0', type: 'core' }],
    };

    const input: GeneratorInput = {
      flow: invalidPackageConfig,
    };

    await expect(generateWalkerOSBundle(input)).rejects.toThrow();
  });

  it('should validate node configurations', async () => {
    const invalidNodeConfig: Flow.Config = {
      ...simpleFlowConfig,
      nodes: [{ id: '', type: 'source', package: '', config: {} }],
    };

    const input: GeneratorInput = {
      flow: invalidNodeConfig,
    };

    await expect(generateWalkerOSBundle(input)).rejects.toThrow();
  });

  it('should handle different package types correctly', async () => {
    const result = await generateWalkerOSBundle({ flow: simpleFlowConfig });

    // Verify package ordering (core -> collector -> source -> destination)
    const coreIndex = result.bundle.indexOf('// @walkeros/core@');
    const collectorIndex = result.bundle.indexOf('// @walkeros/collector@');
    const sourceIndex = result.bundle.indexOf(
      '// @walkeros/web-source-browser@',
    );
    const destinationIndex = result.bundle.indexOf(
      '// @walkeros/web-destination-gtag@',
    );

    expect(coreIndex).toBeLessThan(collectorIndex);
    expect(collectorIndex).toBeLessThan(sourceIndex);
    expect(sourceIndex).toBeLessThan(destinationIndex);
  }, 30000); // 30 second timeout for real npm package resolution

  it('should generate collector configuration from nodes', async () => {
    const result = await generateWalkerOSBundle({ flow: simpleFlowConfig });

    // Parse the generated collector config (this is a basic check)
    expect(result.bundle).toContain('"functional": true');
    expect(result.bundle).toContain('"marketing": false');
    expect(result.bundle).toContain('"queue": true');
  }, 30000); // 30 second timeout for real npm package resolution
});
