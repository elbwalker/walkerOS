import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Collector, Elb, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/server-destination-api';
import { buildInitConfig } from './init-config.js';
import { getEnvironment } from './environment.js';
import { getInstallationId } from './install-id.js';
import { isTelemetryEnabled, isDebugMode } from './consent.js';
import { maybePrintFirstRunNotice } from './first-run-notice.js';

const CONTRACT_VERSION = 1;
const SEND_TIMEOUT_MS = 1000;

export interface EmitterOptions {
  sourceId: 'cli' | 'mcp';
  sourceType: string;
  packageVersion: string;
  session?: string;
}

export interface Emitter {
  send(
    name: string,
    data: WalkerOS.Properties,
    timingMs?: number,
  ): Promise<void>;
}

/**
 * Build the walkerOS telemetry emitter.
 *
 * Consent, debug, and first-run-notice are resolved up-front. When telemetry
 * is not enabled the returned `send` is a no-op that never initializes the
 * collector, never writes a config file, and never touches the network.
 *
 * In debug mode we synthesize the event shape that the collector would emit
 * and write it to stderr instead of starting a real collector. Keeps the
 * output deterministic and avoids paying for collector init when only
 * inspecting payloads.
 *
 * The production path lazily boots a collector on first `send`. The
 * `{ package, config }` shorthand produced by `buildInitConfig` is resolved
 * here into a real `{ code, config }` `Destination.Init<T>` by importing
 * `destinationAPI` from `@walkeros/server-destination-api`. This keeps
 * `init-config.ts` free of the server-destination runtime dependency while
 * centralizing the resolution in the one place that actually runs the flow.
 */
export async function createEmitter(opts: EmitterOptions): Promise<Emitter> {
  if (!isTelemetryEnabled()) {
    return {
      async send() {
        /* no-op */
      },
    };
  }

  const maybeDevice = getInstallationId();
  if (!maybeDevice) {
    // telemetryEnabled === true but no UUID: inconsistent config.
    // Stay silent rather than silently create one post-consent without an
    // explicit user action.
    return {
      async send() {
        /* no-op */
      },
    };
  }
  const device: string = maybeDevice;

  const debug = isDebugMode();
  const endpoint = process.env.TELEMETRY_ENDPOINT || loadFlowJsonEndpoint();
  if (!endpoint && !debug) {
    // No ingest URL configured. Consistent with the "ship consent UX
    // without a backend" contract: opted-in users produce no traffic in
    // v1. Debug mode still runs below because its sole purpose is
    // inspecting payloads locally.
    return {
      async send() {
        /* no-op */
      },
    };
  }

  // First-run notice is purely informational; suppress in debug mode so the
  // debug output stream stays predictable for tooling.
  if (!debug) maybePrintFirstRunNotice();

  const environment = getEnvironment();

  const eventBase: Pick<WalkerOS.DeepPartialEvent, 'source' | 'version'> = {
    source: {
      type: opts.sourceType,
      id: opts.sourceId,
      previous_id: '',
    },
    version: {
      source: opts.packageVersion,
      tagging: CONTRACT_VERSION,
    },
  };

  // Lazy collector init: only pay the cost on first send.
  let elbFn: Elb.Fn | null = null;
  async function ensureElb(): Promise<Elb.Fn> {
    if (elbFn) return elbFn;

    const telemetryConfig = buildInitConfig({
      installationId: device,
      session: opts.session,
      environment,
      endpoint: endpoint ?? '',
    });

    const collectorConfig: Collector.InitConfig = {
      tagging: telemetryConfig.tagging,
      consent: telemetryConfig.consent,
      user: telemetryConfig.user,
      destinations: {
        api: {
          code: destinationAPI,
          config: {
            settings: telemetryConfig.destinations.api.config,
          },
        },
      },
    };

    const { elb } = await startFlow(collectorConfig);
    elbFn = elb;
    return elbFn;
  }

  return {
    async send(name, data, timingMs = 0) {
      const partialEvent: WalkerOS.DeepPartialEvent = {
        name,
        data,
        timing: timingMs,
        ...eventBase,
      };

      if (debug) {
        const user: WalkerOS.User = {
          device,
          ...(opts.session ? { session: opts.session } : {}),
          os: environment.os,
          osVersion: environment.osVersion,
          language: environment.language,
          timezone: environment.timezone,
          node: environment.node,
        };
        const preview = {
          ...partialEvent,
          consent: { telemetry: true },
          user,
        };
        process.stderr.write(
          `[walkeros telemetry debug] ${JSON.stringify(preview)}\n`,
        );
        return;
      }

      try {
        const elb = await ensureElb();
        await withTimeout(elb(partialEvent), SEND_TIMEOUT_MS);
      } catch {
        /* swallow: telemetry must never break the host process */
      }
    },
  };
}

/**
 * Load the telemetry endpoint from the sibling `flow.json` file.
 *
 * The contract file lives next to this module (both in `src/` and in the
 * built `dist/`). We intentionally skip the `$VAR` placeholder that ships
 * in the contract: an unresolved placeholder means no real endpoint, so
 * the caller treats that as "unconfigured" and no-ops.
 */
function loadFlowJsonEndpoint(): string | undefined {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = JSON.parse(readFileSync(join(here, 'flow.json'), 'utf-8')) as {
      flows?: {
        default?: {
          destinations?: { api?: { config?: { url?: string } } };
        };
      };
    };
    const url = raw.flows?.default?.destinations?.api?.config?.url;
    if (url && !url.startsWith('$')) return url;
  } catch {
    /* fall through: caller treats undefined as unconfigured */
  }
  return undefined;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) => {
      const t = setTimeout(() => reject(new Error('telemetry timeout')), ms);
      t.unref();
    }),
  ]);
}
