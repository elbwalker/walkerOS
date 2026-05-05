/* eslint-disable no-console */
import { loadFlowConfig } from '../../config/loader.js';
import { createCLILogger } from '../../core/cli-logger.js';
import { resolveComponent } from './resolve.js';

export interface SetupCommandOptions {
  target: string;
  config?: string;
  flow?: string;
  verbose?: boolean;
  silent?: boolean;
  json?: boolean;
}

/**
 * Narrow shape of `config.setup` we care about: a boolean flag or any object
 * carrying setup options. Mirrors the typed `setup?: boolean | SetupOptions<T>`
 * field on Destination/Source/Store config.
 */
type SetupConfigValue = boolean | object | undefined;

/**
 * Read the `setup` field off a component's opaque `config` payload without
 * resorting to `as` casts. Anything that isn't a config-shaped object yields
 * `undefined`, which the caller treats as "no setup requested".
 */
function readSetupField(config: unknown): SetupConfigValue {
  if (config === null || typeof config !== 'object') return undefined;
  // `'setup' in config` narrows `config` to `{ setup: unknown }` in TS,
  // letting us read the field directly without a cast.
  if (!('setup' in config)) return undefined;
  const value: unknown = config.setup;
  if (typeof value === 'boolean') return value;
  if (value !== null && typeof value === 'object') return value;
  return undefined;
}

/**
 * Type guard for the minimal shape of a walkerOS component's default export:
 * an object that may carry a `setup` function.
 */
interface ComponentDefault {
  setup?: unknown;
}

function isComponentDefault(value: unknown): value is ComponentDefault {
  return value !== null && typeof value === 'object';
}

/** Type guard for the resolved package's setup function. */
function isSetupFn(
  value: unknown,
): value is (input: unknown) => unknown | Promise<unknown> {
  return typeof value === 'function';
}

export async function setupCommand(opts: SetupCommandOptions): Promise<void> {
  const { flowSettings } = await loadFlowConfig(opts.config ?? './flow.json', {
    flowName: opts.flow,
  });

  const component = resolveComponent(flowSettings, opts.target);

  // Framework-level narration so operators know what's happening.
  // The package's own logger output appears between these two lines.
  console.log(`setup: starting ${component.kind}.${component.id}`);

  const mod = await import(component.packageName);
  const code: unknown = mod.default;

  if (!isComponentDefault(code)) {
    throw new Error(
      `Package ${component.packageName} has no default export. ` +
        `walkerOS components are expected to use 'export default'.`,
    );
  }

  const setupFn = code.setup;

  if (!isSetupFn(setupFn)) {
    // No setup defined on the package, narrate explicitly, exit ok.
    console.log(
      `setup: skipped ${component.kind}.${component.id} (no setup function)`,
    );
    return;
  }

  // Honor config.setup explicitly. If user wrote `setup: false`, narrate and skip.
  // (Omitted setup is also falsy and gets the same skip message.)
  const setupConfig = readSetupField(component.config);
  if (setupConfig === false || setupConfig === undefined) {
    const reason = setupConfig === false ? 'false' : 'unset';
    console.log(
      `setup: skipped ${component.kind}.${component.id} (config.setup is ${reason})`,
    );
    return;
  }

  const logger = createCLILogger({
    verbose: opts.verbose,
    silent: opts.silent,
    json: opts.json,
  })
    .scope(component.kind)
    .scope(component.id);

  const result = await setupFn({
    id: component.id,
    config: component.config,
    env: component.env,
    logger,
  });

  // If the package returned structured data, write it as JSON to stdout
  // so operators can pipe through jq for scripting.
  if (result !== undefined && result !== null) {
    console.log(JSON.stringify(result));
  }

  console.log(`setup: ok ${component.kind}.${component.id}`);
}
