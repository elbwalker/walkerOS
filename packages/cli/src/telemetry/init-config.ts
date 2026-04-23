import type { WalkerOS } from '@walkeros/core';
import type { Environment } from './environment.js';

export interface InitConfigInput {
  installationId: string;
  session?: string;
  environment: Environment;
  endpoint: string;
}

/**
 * Telemetry destination reference using the flow-style package shorthand.
 *
 * @remarks
 * Intentionally narrower than `Destination.Init<T>` from `@walkeros/core`.
 * The telemetry emitter is responsible for resolving the `package` reference
 * into the actual destination `code` before handing the config to
 * `startFlow()`. Keeping the shorthand in the builder keeps this file free
 * of a runtime dependency on `@walkeros/server-destination-api`.
 */
export interface TelemetryDestinationReference {
  package: string;
  config: {
    url: string;
  };
}

/**
 * Telemetry-specific init config shape.
 *
 * @remarks
 * Mirrors the subset of `Collector.InitConfig` the telemetry emitter uses
 * (`tagging`, `consent`, `user`, `destinations`). The `destinations` entries
 * use the package-shorthand form rather than `Destination.InitDestinations`
 * so this module stays free of the server-destination-api dependency. The
 * emitter will translate the shorthand into a real `Destination.Init` before
 * calling `startFlow()`.
 */
export interface TelemetryInitConfig {
  tagging: number;
  consent: WalkerOS.Consent;
  user: WalkerOS.User;
  destinations: {
    api: TelemetryDestinationReference;
  };
}

/**
 * Build the init config used by the telemetry emitter. The collector merges
 * `user`, `consent`, and `tagging` into every emitted event, so per-send code
 * only needs to pass `name`, `data`, `timing`, `source`, and `version`.
 *
 * `WalkerOS.User` extends `WalkerOS.Properties`, so carrying a custom `node`
 * field (e.g. `"v22.0.0"`) is structurally valid — `string` is a `Property`.
 */
export function buildInitConfig(input: InitConfigInput): TelemetryInitConfig {
  const user: WalkerOS.User = {
    device: input.installationId,
    os: input.environment.os,
    osVersion: input.environment.osVersion,
    language: input.environment.language,
    timezone: input.environment.timezone,
    node: input.environment.node,
  };
  if (input.session) user.session = input.session;

  return {
    tagging: 1,
    consent: { telemetry: true },
    user,
    destinations: {
      api: {
        package: '@walkeros/server-destination-api',
        config: { url: input.endpoint },
      },
    },
  };
}
