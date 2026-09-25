/**
 * The values of the secrets a flow references are masked at every simulate
 * egress: the `--json` and text output, and the running flow's own logs.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Flow } from '@walkeros/core';
import { renderPushOutput, simulateDestination } from '../index.js';
import type { PushResult } from '../types.js';

/** A multi-line service account: its JSON escapes the newlines. */
const PRIVATE_KEY =
  '-----BEGIN PRIVATE KEY-----\nMIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAq7BFUpkGp3+LQmlQ\nYx2eqzDV+xeG8kx/sQFV18S5JwzFJdBOPRZsJkbuBDN8M1SXgfFXO2x+tpQwVBC2\n-----END PRIVATE KEY-----\n';
const SERVICE_ACCOUNT = JSON.stringify(
  {
    type: 'service_account',
    project_id: 'demo-project',
    private_key: PRIVATE_KEY,
  },
  null,
  2,
);
const KEY_MATERIAL = 'Yx2eqzDV+xeG8kx/sQFV18S5JwzFJdBOPRZsJkbuBDN8M1SXgfFXO2x';
const TOKEN = 'tok-flow-known-3b9f';

function simulated(arg: unknown): PushResult {
  return {
    success: true,
    duration: 1,
    simulations: [
      {
        step: 'destination',
        name: 'bigquery',
        events: [],
        calls: [{ fn: 'BigQuery', args: [arg], ts: 1 }],
        duration: 1,
      },
    ],
  };
}

describe('known secrets at the push output', () => {
  it.each([true, false])(
    'masks a service account passed as a JSON string (json: %s)',
    (json) => {
      const output = renderPushOutput(
        simulated({ credentials: SERVICE_ACCOUNT }),
        { json, knownSecrets: [SERVICE_ACCOUNT] },
      );

      expect(output).not.toContain(KEY_MATERIAL);
      expect(output).toContain('BigQuery');
    },
  );

  it.each([true, false])(
    'masks a plain token no pattern knows (json: %s)',
    (json) => {
      const output = renderPushOutput(simulated({ auth: TOKEN }), {
        json,
        knownSecrets: [TOKEN],
      });

      expect(output).not.toContain(TOKEN);
    },
  );
});

describe('known secrets in the flow logs', () => {
  let dir: string;
  let bundlePath: string;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'simulate-known-'));
    bundlePath = path.join(dir, 'bundle.mjs');
    // The stub logs the destination's token through the flow's logger, the
    // way a failing vendor call would, then stops the simulation.
    await fs.writeFile(
      bundlePath,
      `
export function wireConfig() {
  return { destinations: { api: { config: {} } } };
}
export async function startFlow(config) {
  config.logger.handler(0, 'request failed', { token: process.env.KNOWN_TEST_TOKEN }, ['api']);
  throw new Error('stub stop');
}
export const __devExports = {
  '@walkeros/server-destination-api': async () => ({
    examples: { env: { push: { sendServer: () => undefined } } },
  }),
};
`,
    );
    process.env.KNOWN_TEST_TOKEN = TOKEN;
  });

  afterAll(async () => {
    delete process.env.KNOWN_TEST_TOKEN;
    await fs.remove(dir);
  });

  const flowJson: Flow.Json = {
    version: 4,
    flows: {
      default: {
        config: { platform: 'server' },
        destinations: {
          api: {
            package: '@walkeros/server-destination-api',
            config: { settings: { token: '$secret.KNOWN_TEST_TOKEN' } },
          },
        },
      },
    },
  };

  it.each([true, false])(
    'masks a referenced secret in a flow log line (json: %s)',
    async (json) => {
      const lines: string[] = [];
      const spy = jest
        .spyOn(console, 'error')
        .mockImplementation((...args: unknown[]) => {
          lines.push(args.map(String).join(' '));
        });
      try {
        await simulateDestination(
          flowJson,
          { name: 'page view' },
          { destinationId: 'api', bundlePath, json },
        );
      } finally {
        spy.mockRestore();
      }

      const logged = lines.join('\n');
      expect(logged).toContain('request failed');
      expect(logged).not.toContain(TOKEN);
    },
  );
});
