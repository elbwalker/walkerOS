import type { Collector, Elb, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/server-destination-api';
import { buildInitConfig } from './init-config.js';
import { getEnvironment } from './environment.js';
import { getInstallationId } from './install-id.js';
import { isTelemetryEnabled, isDebugMode } from './consent.js';
import { maybePrintFirstRunNotice } from './first-run-notice.js';
import { resolveAppUrl } from '../lib/config-file.js';

const SEND_TIMEOUT_MS = 1000;

export interface EmitterOptions {
  /** Caller supplies the v4 source verbatim (type, platform, etc). */
  source: WalkerOS.Source;
  packageVersion: string;
  session?: string;
}

export interface Emitter {
  send(
    name: string,
    data: WalkerOS.Properties,
    timingMs?: number,
    sourceOverride?: Partial<WalkerOS.Source>,
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
  const endpoint = resolveTelemetryEndpoint();
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

  const baseSource: WalkerOS.Source = {
    ...opts.source,
    version: opts.packageVersion,
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
    async send(name, data, timingMs = 0, sourceOverride) {
      const partialEvent: WalkerOS.DeepPartialEvent = {
        name,
        data,
        timing: timingMs,
        source: { ...baseSource, ...sourceOverride },
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
 * Resolve the telemetry ingest endpoint.
 *
 * Reuses `resolveAppUrl()` from `lib/config-file` so a single
 * `walkeros auth login` (which writes `appUrl` to the user config) wires
 * telemetry alongside auth. Order: env (`WALKEROS_APP_URL`) > user config
 * (`~/.config/walkeros/config.json:appUrl`) > undefined (telemetry no-ops).
 *
 * Hard-cut: `TELEMETRY_ENDPOINT` is no longer recognized.
 */
export function resolveTelemetryEndpoint(): string | undefined {
  const appUrl = resolveAppUrl();
  if (!appUrl) return undefined;
  return `${appUrl.replace(/\/$/, '')}/api/telemetry`;
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
