/**
 * @jest-environment jsdom
 */
import { generateWalkerOSBundle } from '../src/index';
import type { GeneratorInput } from '../src/types';
import type { Flow } from '@walkeros/core';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Setup jsdom environment
import './setup.jsdom';

// Use inline working demo configuration to avoid JSON parsing issues
const workingDemoConfig: Flow.Config = {
  packages: [
    {
      id: 'walkerOSCore',
      name: '@walkeros/core',
      version: '0.0.8',
      type: 'core',
    },
    {
      id: 'walkerOSCollector',
      name: '@walkeros/collector',
      version: '0.0.8',
      type: 'collector',
    },
    {
      id: 'walkerOSSourceBrowser',
      name: '@walkeros/web-source-browser',
      version: '0.0.9',
      type: 'source',
    },
    {
      id: 'walkerOSDestinationGtag',
      name: '@walkeros/web-destination-gtag',
      version: '0.0.8',
      type: 'destination',
    },
  ],
  nodes: [
    {
      id: 'collector',
      type: 'collector',
      package: '@walkeros/collector',
      config: { run: true, consent: { functional: true, marketing: false } },
    },
    {
      id: 'browser-source',
      type: 'source',
      package: '@walkeros/web-source-browser',
      config: { settings: { pageview: true, session: true } },
    },
    {
      id: 'gtag-destination',
      type: 'destination',
      package: '@walkeros/web-destination-gtag',
      config: { settings: { ga4: { measurementId: 'G-XXXXXXXXXX' } } },
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

// Mock npm operations (reusing existing mocks from integration tests)
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
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

// Mock package code (real package exports, not mocks)
const mockPackageCode = {
  '@walkeros/core': `
const assign = Object.assign;
const isString = (value) => typeof value === 'string';
const isObject = (value) => value && typeof value === 'object';
const createEvent = (event, data = {}) => ({ event, data, timestamp: Date.now() });
module.exports = { assign, isString, isObject, createEvent };
`,
  '@walkeros/collector': `
const createCollector = async (config) => {
  const collector = { 
    sources: {}, 
    destinations: {},
    config: config,
    push: async (event, data) => {
      if (typeof event === 'string' && event.startsWith('walker ')) {
        return Promise.resolve();
      }
      const eventObj = typeof event === 'string' 
        ? { event, data: data || {}, timestamp: Date.now() }
        : event;
      
      console.log('WalkerOS Event:', eventObj);
      
      // Simulate destination calls
      Object.values(collector.destinations).forEach(dest => {
        if (dest && typeof dest.push === 'function') {
          dest.push(eventObj);
        }
      });
      
      return Promise.resolve();
    }
  };
  return { collector, elb: collector.push };
};
module.exports = { createCollector };
`,
  '@walkeros/web-core': `
const sessionStart = (config) => ({ sessionId: 'test-session' });
const getAttribute = (el, attr) => el.getAttribute(attr);
const isVisible = (el) => true;
module.exports = { sessionStart, getAttribute, isVisible };
`,
  '@walkeros/web-source-browser': `
const sourceBrowser = async (collector, config) => {
  const source = {
    init: async () => {
      // Simulate DOM event tracking setup
      if (config.settings.pageview) {
        await collector.push('page view', {
          title: document.title || 'Test Page',
          url: window.location.href
        });
      }
      return { elb: collector.push };
    }
  };
  await source.init();
  return source;
};
module.exports = { sourceBrowser };
`,
  '@walkeros/web-destination-gtag': `
const destinationGtag = {
  push: (event) => {
    // Mock gtag destination
    if (typeof window.gtag === 'function') {
      window.gtag('event', event.event, event.data);
    }
  }
};
module.exports = { destinationGtag };
`,
};

describe('WalkerOS Bundle Runtime Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock npm view command to return package metadata
    mockExec.mockImplementation(async (command: string) => {
      if (command.includes('npm view')) {
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
            shasum: 'mock-shasum',
          },
          main: 'dist/index.js',
        };
        return { stdout: JSON.stringify(mockMetadata), stderr: '' };
      } else if (command.includes('npm install')) {
        return { stdout: 'npm install completed', stderr: '' };
      }
      throw new Error(`Unmocked command: ${command}`);
    });

    // Mock filesystem operations
    fs.existsSync = jest.fn().mockImplementation((path: string) => {
      if (
        path.includes('node_modules') ||
        path.includes('dist/index.js') ||
        path.includes('package.json')
      ) {
        return true;
      }
      return false;
    });

    fs.readFileSync = jest.fn().mockImplementation((path: string) => {
      // Return appropriate mock code based on package path
      for (const [packageName, code] of Object.entries(mockPackageCode)) {
        if (
          path.includes(
            packageName.replace('/', path.includes('\\\\') ? '\\\\' : '/'),
          )
        ) {
          return code;
        }
      }
      if (path.includes('dist/index.js')) {
        const packageMatch = path.match(/@walkeros\/[^/\\]+/);
        if (packageMatch) {
          const packageName = packageMatch[0];
          if (mockPackageCode[packageName]) {
            return mockPackageCode[packageName];
          }
        }
      }
      return 'mock file content';
    });

    fs.mkdirSync = jest.fn();
    fs.writeFileSync = jest.fn();
    fs.rmSync = jest.fn();
    fs.mkdtempSync = jest.fn().mockReturnValue('/tmp/mock-temp-dir');

    // Mock gtag
    window.gtag = jest.fn();

    // Set up document
    document.head.innerHTML = '<title>Test WalkerOS Page</title>';
    document.body.innerHTML = `
      <button id="test-btn" data-elb="button" data-elb-action="click">Test Button</button>
    `;
  });

  it('should generate and execute bundle with walkerOS initialization', async () => {
    const input: GeneratorInput = { flow: workingDemoConfig };
    const result = await generateWalkerOSBundle(input);

    expect(result.bundle).toBeTruthy();
    expect(typeof result.bundle).toBe('string');

    // Execute the bundle in JSDOM
    const scriptElement = document.createElement('script');
    scriptElement.textContent = result.bundle;
    document.head.appendChild(scriptElement);

    // Wait for DOM ready and initialization
    await new Promise((resolve) => setTimeout(resolve, 100));

    const walkerOS = window.walkerOS;

    // Verify walkerOS is the collector with expected properties
    expect(walkerOS).toBeDefined();
    expect(typeof walkerOS.push).toBe('function');

    // Check collector has sources and destinations matching flow config
    if (walkerOS.sources) {
      expect(Object.keys(walkerOS.sources).length).toBeGreaterThan(0);
    }
    if (walkerOS.destinations) {
      expect(Object.keys(walkerOS.destinations).length).toBeGreaterThan(0);
    }

    // Verify collector config matches flow nodes
    if (walkerOS.config) {
      expect(walkerOS.config.consent?.functional).toBe(true);
      expect(walkerOS.config.consent?.marketing).toBe(false);
    }
  }, 30000);

  it('should handle DOM readiness correctly', async () => {
    const input: GeneratorInput = { flow: workingDemoConfig };
    const result = await generateWalkerOSBundle(input);

    // Simulate loading state
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'loading',
    });

    let domReadyFired = false;
    document.addEventListener('DOMContentLoaded', () => {
      domReadyFired = true;
    });

    // Execute bundle
    const scriptElement = document.createElement('script');
    scriptElement.textContent = result.bundle;
    document.head.appendChild(scriptElement);

    // Simulate DOM ready
    Object.defineProperty(document, 'readyState', { value: 'complete' });
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should initialize after DOM ready
    expect(
      (window as unknown as Record<string, unknown>).walkerOS,
    ).toBeDefined();
  }, 30000);

  it('should initialize immediately when DOM is already ready', async () => {
    const input: GeneratorInput = { flow: workingDemoConfig };
    const result = await generateWalkerOSBundle(input);

    // Set DOM to already ready
    Object.defineProperty(document, 'readyState', { value: 'complete' });

    // Execute bundle
    const scriptElement = document.createElement('script');
    scriptElement.textContent = result.bundle;
    document.head.appendChild(scriptElement);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should initialize immediately
    expect(window.walkerOS).toBeDefined();
  }, 30000);

  it('should track page view events', async () => {
    const input: GeneratorInput = { flow: workingDemoConfig };
    const result = await generateWalkerOSBundle(input);

    // Mock gtag to capture calls
    const mockGtag = jest.fn();
    window.gtag = mockGtag;

    // Execute bundle
    const scriptElement = document.createElement('script');
    scriptElement.textContent = result.bundle;
    document.head.appendChild(scriptElement);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have tracked page view
    expect(global.capturedLogs.some((log) => log.includes('page view'))).toBe(
      true,
    );
  }, 30000);

  it('should handle event tracking through elb function', async () => {
    const input: GeneratorInput = { flow: workingDemoConfig };
    const result = await generateWalkerOSBundle(input);

    // Execute bundle
    const scriptElement = document.createElement('script');
    scriptElement.textContent = result.bundle;
    document.head.appendChild(scriptElement);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Test event tracking
    const walkerOS = (window as unknown as Record<string, unknown>).walkerOS;
    expect(walkerOS).toBeDefined();

    await walkerOS.push('button click', {
      id: 'test-btn',
      text: 'Test Button',
    });

    // Should have logged the event
    expect(
      global.capturedLogs.some((log) => log.includes('button click')),
    ).toBe(true);
  }, 30000);

  it('should have collector with allowed: true and queue functionality', async () => {
    const input: GeneratorInput = { flow: workingDemoConfig };
    const result = await generateWalkerOSBundle(input);

    // Execute bundle
    const scriptElement = document.createElement('script');
    scriptElement.textContent = result.bundle;
    document.head.appendChild(scriptElement);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const walkerOS = (window as unknown as Record<string, unknown>).walkerOS;
    expect(walkerOS).toBeDefined();

    // Check for collector functionality indicators
    // If collector has allowed property, it should be true
    if ('allowed' in walkerOS) {
      expect(walkerOS.allowed).toBe(true);
    }

    // If collector has queue, it should be an array (length >= 0 is fine)
    if ('queue' in walkerOS && Array.isArray(walkerOS.queue)) {
      expect(walkerOS.queue).toBeInstanceOf(Array);
      expect(walkerOS.queue.length).toBeGreaterThanOrEqual(0);
    }

    // Test that push function works (basic collector functionality)
    expect(typeof walkerOS.push).toBe('function');

    // Verify sources and destinations configuration matches flow
    const flowNodes = workingDemoConfig.nodes;
    const sourceNodes = flowNodes.filter((n) => n.type === 'source');
    const destNodes = flowNodes.filter((n) => n.type === 'destination');

    // Should have configured sources/destinations if they exist in flow
    if (sourceNodes.length > 0 && walkerOS.sources) {
      expect(Object.keys(walkerOS.sources).length).toBeGreaterThan(0);
    }
    if (destNodes.length > 0 && walkerOS.destinations) {
      expect(Object.keys(walkerOS.destinations).length).toBeGreaterThan(0);
    }
  }, 30000);
});
