/**
 * Destination simulate: consent as the collector's starting state, command
 * examples, and why nothing was sent.
 *
 * One web flow is bundled against the monorepo packages; each destination id
 * is a separate scenario, since destination simulate starts only its target.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Flow, Simulation, WalkerOS } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { formatPushResult, simulateDestination } from '../index.js';
import { runPushCommand } from '../run.js';
import { bundleLocalFlow } from './local-bundle.js';

const VERSION = { version: '*' };

function webFlow(): Flow.Json {
  return {
    version: 4,
    flows: {
      default: {
        config: {
          platform: 'web',
          bundle: {
            packages: {
              '@walkeros/collector': VERSION,
              '@walkeros/web-destination-api': VERSION,
              '@walkeros/web-destination-gtag': VERSION,
            },
          },
        },
        destinations: {
          api: {
            package: '@walkeros/web-destination-api',
            config: {
              require: ['consent'],
              settings: { url: 'https://collect.example.com/events' },
            },
          },
          gtm: {
            package: '@walkeros/web-destination-gtag',
            config: {
              require: ['consent'],
              consent: { marketing: true },
              queue: true,
              settings: { gtm: { containerId: 'GTM-TEST01' } },
              mapping: { product: { add: { name: 'elb product add' } } },
            },
          },
          gtmNoQueue: {
            package: '@walkeros/web-destination-gtag',
            config: {
              require: ['consent'],
              consent: { marketing: true },
              settings: { gtm: { containerId: 'GTM-TEST02' } },
            },
          },
          ga4: {
            package: '@walkeros/web-destination-gtag',
            config: {
              settings: { ga4: { measurementId: 'G-TEST01' }, como: true },
            },
          },
        },
      },
    },
  };
}

const productAdd: WalkerOS.DeepPartialEvent = {
  name: 'product add',
  entity: 'product',
  action: 'add',
  data: { id: 'SKU-1', price: 129.9 },
};

function consentCalls(result: Simulation.Result): unknown[][] {
  return result.calls
    .filter((call) => call.fn === 'window.gtag' && call.args[0] === 'consent')
    .map((call) => call.args);
}

describe('destination simulate with consent', () => {
  let tmpDir: string;
  let bundlePath: string;
  let config: Flow.Json;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simulate-consent-'));
    config = webFlow();
    bundlePath = await bundleLocalFlow(config, path.join(tmpDir, 'flow.mjs'));
  }, 180000);

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  const run = (
    destinationId: string,
    event: WalkerOS.DeepPartialEvent | Record<string, unknown>,
    extra: {
      consent?: WalkerOS.Consent;
      command?: Flow.StepCommand;
    } = {},
  ) =>
    simulateDestination(config, event, {
      destinationId,
      bundlePath,
      silent: true,
      ...extra,
    });

  it('reports a require:["consent"] destination as pending without consent', async () => {
    const result = await run('api', productAdd);

    expect(result.error).toBeUndefined();
    expect(result.calls).toEqual([]);
    expect(result.skipped).toEqual({ reason: 'pending', require: ['consent'] });
  });

  it('starts a require:["consent"] destination from the starting consent', async () => {
    const result = await run('api', productAdd, {
      consent: { functional: true },
    });

    expect(result.error).toBeUndefined();
    expect(result.skipped).toBeUndefined();
    expect(result.calls.map((call) => call.fn)).toEqual(['sendWeb']);
  });

  it.each(['gtmNoQueue', 'gtm'])(
    '%s: a consent skip names what is required and what was granted',
    async (destinationId) => {
      const result = await run(destinationId, productAdd, {
        consent: { functional: true },
      });

      expect(result.error).toBeUndefined();
      expect(result.calls).toEqual([]);
      expect(result.mappingKey).toBeUndefined();
      expect(result.skipped).toEqual({
        reason: 'consent',
        required: { marketing: true },
        granted: { functional: true },
      });
    },
  );

  it('records the dataLayer push of a consented gtm destination', async () => {
    const result = await run('gtm', productAdd, {
      consent: { functional: true, marketing: true },
    });

    expect(result.error).toBeUndefined();
    expect(result.skipped).toBeUndefined();
    expect(result.mappingKey).toBe('product add');
    expect(result.calls.map((call) => call.fn)).toContain(
      'window.dataLayer.push',
    );
  });

  it('runs a consent command example instead of a push', async () => {
    const result = await run(
      'ga4',
      { functional: true, marketing: true },
      { command: 'consent' },
    );

    expect(result.error).toBeUndefined();
    expect(consentCalls(result)).toContainEqual([
      'consent',
      'update',
      expect.objectContaining({ ad_storage: 'granted' }),
    ]);
  });

  it('applies the starting consent first, then the command', async () => {
    const result = await run(
      'ga4',
      { marketing: true },
      { consent: { marketing: false }, command: 'consent' },
    );

    expect(result.error).toBeUndefined();
    const updates = consentCalls(result).filter((args) => args[1] === 'update');
    expect(updates[updates.length - 1]).toEqual([
      'consent',
      'update',
      expect.objectContaining({ ad_storage: 'granted' }),
    ]);
    expect(updates.slice(0, -1)).toContainEqual([
      'consent',
      'update',
      expect.objectContaining({ ad_storage: 'denied' }),
    ]);
  });

  it('prints why nothing was sent', () => {
    const base = { step: 'destination' as const, events: [], calls: [] };
    const text = formatPushResult({
      success: true,
      duration: 1,
      simulations: [
        {
          ...base,
          name: 'gtm',
          duration: 1,
          skipped: {
            reason: 'consent',
            required: { marketing: true },
            granted: { functional: true, marketing: false },
          },
        },
        {
          ...base,
          name: 'api',
          duration: 1,
          skipped: { reason: 'pending', require: ['consent'] },
        },
      ],
    });

    expect(text).toContain(
      'skipped: consent (requires marketing; granted functional)',
    );
    expect(text).toContain('pending: waits for consent (require)');
  });
});

describe('destination simulate starts only its target', () => {
  let dir: string;
  let bundlePath: string;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'simulate-target-'));
    bundlePath = path.join(dir, 'bundle.mjs');
    // The stub records the config startFlow receives and every command, then
    // answers like a collector whose target delivered nothing.
    await fs.writeFile(
      bundlePath,
      `
export function wireConfig() {
  return {
    destinations: {
      ga4: { config: {} },
      gtm: { config: { require: ['consent'] } },
      meta: { config: {} },
    },
  };
}
export async function startFlow(config) {
  globalThis.__simulateTarget = { config, commands: [] };
  const collector = {
    destinations: { gtm: {} },
    pending: { destinations: {} },
    observers: new Set(),
    push: async () => ({ ok: true }),
    command: async (name, data) => {
      globalThis.__simulateTarget.commands.push([name, data]);
      return { ok: true };
    },
  };
  return { collector };
}
export const __devExports = {
  '@walkeros/web-destination-gtag': async () => ({
    examples: { env: { push: { window: {} } } },
  }),
};
`,
    );
  });

  afterAll(async () => {
    await fs.remove(dir);
  });

  const flowJson: Flow.Json = {
    version: 4,
    flows: {
      default: {
        config: { platform: 'web' },
        destinations: {
          ga4: { package: '@walkeros/web-destination-gtag' },
          gtm: { package: '@walkeros/web-destination-gtag' },
          meta: { package: '@walkeros/web-destination-meta' },
        },
      },
    },
  };

  function recorded(): {
    config: Record<string, unknown>;
    destinationIds: string[];
    commands: unknown;
  } {
    const value: unknown = Reflect.get(globalThis, '__simulateTarget');
    if (!isObject(value) || !isObject(value.config))
      throw new Error('startFlow was not called');
    const { destinations } = value.config;
    return {
      config: value.config,
      destinationIds: isObject(destinations) ? Object.keys(destinations) : [],
      commands: value.commands,
    };
  }

  it('hands startFlow only the target, with consent as starting state', async () => {
    const result = await simulateDestination(
      flowJson,
      { name: 'product add' },
      {
        destinationId: 'gtm',
        bundlePath,
        silent: true,
        consent: { marketing: true },
      },
    );

    expect(result.error).toBeUndefined();
    const { config, destinationIds, commands } = recorded();
    expect(config.consent).toEqual({ marketing: true });
    expect(destinationIds).toEqual(['gtm']);
    // Simulate issues no consent command of its own: the real startFlow
    // applies the starting consent pre-run as a consent command (this stub
    // does not), heard only by the registered target. Only the closing
    // shutdown runs through collector.command here.
    expect(commands).toEqual([['shutdown', undefined]]);
  });

  it('keeps only the target when a command example runs', async () => {
    await simulateDestination(
      flowJson,
      { marketing: true },
      {
        destinationId: 'gtm',
        bundlePath,
        silent: true,
        consent: { functional: true },
        command: 'consent',
      },
    );

    const { destinationIds, commands } = recorded();
    expect(destinationIds).toEqual(['gtm']);
    expect(commands).toEqual([
      ['consent', { marketing: true }],
      ['shutdown', undefined],
    ]);
  });

  it('names the flow destinations when the target is missing', async () => {
    const result = await simulateDestination(
      flowJson,
      { name: 'product add' },
      { destinationId: 'nope', bundlePath, silent: true },
    );

    expect(result.error?.message).toBe(
      'Destination "nope" not found in collector. Available: ga4, gtm, meta',
    );
  });
});

describe('--consent and --command scope', () => {
  const CONSENT_SCOPE =
    "--consent sets the collector's starting consent for a simulation; a real push uses the flow's own consent.";

  it('rejects --consent for a real push', async () => {
    const result = await runPushCommand({
      config: 'flow.json',
      event: '{"name":"page view"}',
      simulate: [],
      consentSource: '{"marketing":true}',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(CONSENT_SCOPE);
  });

  it('rejects a --consent that is not an object of booleans', async () => {
    const result = await runPushCommand({
      config: 'flow.json',
      event: '{"name":"page view"}',
      simulate: ['destination.gtm'],
      consentSource: '{"marketing":"yes"}',
    });

    expect(result.error).toBe('--consent must be a JSON object of booleans');
  });

  it.each([
    ['a real push', []],
    ['transformer simulation', ['transformer.enrich']],
    ['collector simulation', ['collector.default']],
    ['source simulation', ['source.browser']],
  ])('rejects --command for %s', async (_label, simulate) => {
    const result = await runPushCommand({
      config: 'flow.json',
      event: '{"marketing":true}',
      simulate,
      command: 'consent',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      '--command applies to destination simulation only.',
    );
  });
});
