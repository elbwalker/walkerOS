import path from 'path';
import { pathToFileURL } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs-extra';
import { getPlatform } from '@walkeros/core';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  getErrorMessage,
  detectInput,
  isStdinPiped,
  readStdinToTempFile,
  writeResult,
  type Platform,
} from '../../core/index.js';
import { validateEvent } from '../../core/event-validation.js';
import type { Logger } from '@walkeros/core';
import { getTmpPath } from '../../core/tmp.js';
import { loadFlowConfig, loadJsonFromSource } from '../../config/index.js';
import { loadConfig } from '../../config/utils.js';
import { bundleCore } from '../bundle/bundler.js';
import type { PushCommandOptions, PushResult } from './types.js';
import type { PushOptions } from '../../schemas/push.js';
import { buildOverrides, type PushOverrides } from './overrides.js';
import { applyOverrides } from './apply-overrides.js';
import { resolvePackageImportPath } from '../../core/package-path.js';

/**
 * Core push logic without CLI concerns (no process.exit, no output formatting)
 */
async function pushCore(
  inputPath: string,
  event: unknown,
  options: {
    flow?: string;
    json?: boolean;
    verbose?: boolean;
    silent?: boolean;
    platform?: string;
    simulate?: string[];
    mock?: string[];
    snapshot?: string;
  } = {},
): Promise<PushResult> {
  const logger = createCLILogger({
    silent: options.silent,
    verbose: options.verbose,
  });
  const startTime = Date.now();
  let tempDir: string | undefined;

  try {
    // Validate event format
    const validation = validateEvent(event, 'standard');
    if (!validation.valid) {
      const errors = validation.errors
        .map((e) => `${e.path}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid event: ${errors}`);
    }
    for (const w of validation.warnings) {
      logger.info(`Warning: ${w.message}`);
    }

    const eventObj = event as { name?: string; data?: Record<string, unknown> };
    const validatedEvent: { name: string; data: Record<string, unknown> } = {
      name: eventObj.name!,
      data: (eventObj.data || {}) as Record<string, unknown>,
    };

    // Detect input type
    logger.debug('Detecting input type');
    const detected = await detectInput(
      inputPath,
      options.platform as Platform | undefined,
    );

    let result: PushResult;

    // Load snapshot code if provided
    let snapshotCode: string | undefined;
    if (options.snapshot) {
      snapshotCode = (await loadConfig(options.snapshot, {
        json: false,
      })) as string;
      logger.debug(`Snapshot loaded (${snapshotCode.length} bytes)`);
    }

    if (detected.type === 'config') {
      result = await executeConfigPush(
        {
          config: inputPath,
          flow: options.flow,
          verbose: options.verbose,
          simulate: options.simulate,
          mock: options.mock,
        } as PushCommandOptions,
        validatedEvent,
        logger,
        (dir) => {
          tempDir = dir;
        },
        snapshotCode,
      );
    } else {
      result = await executeBundlePush(
        detected.content,
        detected.platform,
        validatedEvent,
        logger,
        (dir) => {
          tempDir = dir;
        },
        undefined,
        snapshotCode,
      );
    }

    return result;
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    if (tempDir) {
      await fs.remove(tempDir).catch(() => {});
    }
  }
}

/**
 * CLI command handler for push command
 */
export async function pushCommand(options: PushCommandOptions): Promise<void> {
  const logger = createCLILogger({ ...options, stderr: true });
  const startTime = Date.now();

  try {
    // Resolve config: stdin > argument > default
    let config: string;
    if (isStdinPiped() && !options.config) {
      config = await readStdinToTempFile('push');
    } else {
      config = options.config || 'bundle.config.json';
    }

    const result = await push(config, options.event, {
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
      platform: options.platform as Platform | undefined,
      simulate: options.simulate,
      mock: options.mock,
      snapshot: options.snapshot,
    });

    const duration = Date.now() - startTime;

    // Format result
    let output: string;
    if (options.json) {
      output = JSON.stringify(
        {
          success: result.success,
          event: result.elbResult,
          duration,
        },
        null,
        2,
      );
    } else {
      const lines: string[] = [];
      if (result.success) {
        lines.push('Event pushed successfully');
        if (result.elbResult && typeof result.elbResult === 'object') {
          const pushResult = result.elbResult as unknown as Record<
            string,
            unknown
          >;
          if ('id' in pushResult && pushResult.id)
            lines.push(`  Event ID: ${pushResult.id}`);
          if ('entity' in pushResult && pushResult.entity)
            lines.push(`  Entity: ${pushResult.entity}`);
          if ('action' in pushResult && pushResult.action)
            lines.push(`  Action: ${pushResult.action}`);
        }
        lines.push(`  Duration: ${duration}ms`);
      } else {
        lines.push(`Error: ${result.error}`);
      }
      output = lines.join('\n');
    }

    // Write to file or stdout
    await writeResult(output + '\n', { output: options.output });

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      const errorOutput = JSON.stringify(
        { success: false, error: errorMessage, duration },
        null,
        2,
      );
      await writeResult(errorOutput + '\n', { output: options.output });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }

    process.exit(1);
  }
}

/**
 * High-level push function for programmatic usage.
 *
 * WARNING: This makes real API calls to real endpoints.
 * Events will be sent to configured destinations (analytics, CRM, etc.).
 *
 * @param configOrPath - Path to flow configuration file or pre-built bundle
 * @param event - Event object to push
 * @param options - Push options
 * @param options.silent - Suppress all output (default: false)
 * @param options.verbose - Enable verbose logging (default: false)
 * @param options.json - Format output as JSON (default: false)
 * @returns Push result with success status, elb result, and duration
 *
 * @example
 * ```typescript
 * const result = await push('./walker.config.json', {
 *   name: 'page view',
 *   data: { title: 'Home Page', path: '/', url: 'https://example.com' }
 * });
 * ```
 */
export async function push(
  configOrPath: string | unknown,
  event: unknown,
  options: PushOptions & {
    flow?: string;
    platform?: Platform;
    simulate?: string[];
    mock?: string[];
    snapshot?: string;
  } = {},
): Promise<PushResult> {
  if (typeof configOrPath !== 'string') {
    throw new Error(
      'push() currently only supports config file paths. ' +
        'Config object support will be added in a future version. ' +
        'Please provide a path to a configuration file.',
    );
  }

  // Resolve string event inputs (file paths, URLs, JSON strings)
  let resolvedEvent = event;
  if (typeof event === 'string') {
    resolvedEvent = await loadJsonFromSource(event, { name: 'event' });
  }

  return await pushCore(configOrPath, resolvedEvent, {
    json: options.json ?? false,
    verbose: options.verbose ?? false,
    silent: options.silent ?? false,
    flow: options.flow,
    platform: options.platform,
    simulate: options.simulate,
    mock: options.mock,
    snapshot: options.snapshot,
  });
}

/**
 * Execute push from config JSON (existing behavior)
 */
async function executeConfigPush(
  options: PushCommandOptions,
  validatedEvent: { name: string; data: Record<string, unknown> },
  logger: Logger.Instance,
  setTempDir: (dir: string) => void,
  snapshotCode?: string,
): Promise<PushResult> {
  // Load config
  logger.debug('Loading flow configuration');
  const { flowSettings, buildOptions } = await loadFlowConfig(options.config!, {
    flowName: options.flow,
    logger,
  });

  const platform = getPlatform(flowSettings);

  // Build overrides from --simulate/--mock flags
  const overrides = buildOverrides(
    { simulate: options.simulate, mock: options.mock },
    flowSettings,
  );

  // Auto-load destination /dev envs for simulated/mocked destinations
  if (overrides.destinations) {
    const { loadDestinationEnvs } = await import('./env-loader.js');
    const configDir = buildOptions.configDir || process.cwd();
    const envs = await loadDestinationEnvs(
      flowSettings.destinations ?? {},
      flowSettings.packages,
      configDir,
    );
    for (const [destId, env] of Object.entries(envs)) {
      if (overrides.destinations[destId] && env.push) {
        overrides.destinations[destId].env = env.push;
        if (env.simulation && env.simulation.length > 0) {
          overrides.destinations[destId].simulation = env.simulation;
        }
      }
    }
  }

  // Bundle to temp file
  logger.debug('Bundling flow configuration');
  const tempDir = getTmpPath(
    undefined,
    `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  setTempDir(tempDir);
  await fs.ensureDir(tempDir);
  const tempPath = path.join(tempDir, 'bundle.mjs');

  const pushBuildOptions = {
    ...buildOptions,
    output: tempPath,
    format: 'esm' as const,
    platform: platform === 'web' ? ('browser' as const) : ('node' as const),
    skipWrapper: true, // CLI imports ESM directly — no platform wrapper
  };

  await bundleCore(flowSettings, pushBuildOptions, logger, false);

  logger.debug(`Bundle created: ${tempPath}`);

  // Check for source simulation
  const sourceSimulateEntry = overrides.sources
    ? Object.entries(overrides.sources).find(([, s]) => s.simulate)
    : undefined;

  if (sourceSimulateEntry) {
    const [sourceId] = sourceSimulateEntry;
    const sourceConfig = (flowSettings.sources ?? {})[sourceId] as
      | { package?: string }
      | undefined;

    if (!sourceConfig?.package) {
      throw new Error(`Source "${sourceId}" has no package defined`);
    }

    // Load createTrigger from source package's /dev export
    const configDir = buildOptions.configDir || process.cwd();
    const devPath = resolvePackageImportPath(
      sourceConfig.package,
      flowSettings.packages,
      configDir,
      '/dev',
    );
    const devModule = await import(devPath);
    const createTrigger =
      devModule.examples?.createTrigger ||
      devModule.default?.examples?.createTrigger;

    if (!createTrigger) {
      throw new Error(
        `Source package "${sourceConfig.package}" has no createTrigger in /dev export`,
      );
    }

    return executeSourceSimulation(
      tempPath,
      validatedEvent,
      logger,
      overrides,
      createTrigger,
      platform,
      snapshotCode,
    );
  }

  // Execute based on platform (destination push path)
  if (platform === 'web') {
    logger.debug('Executing in web environment (JSDOM)');
    return executeWebPush(
      tempPath,
      validatedEvent,
      logger,
      overrides,
      snapshotCode,
    );
  } else if (platform === 'server') {
    logger.debug('Executing in server environment (Node.js)');
    return executeServerPush(
      tempPath,
      validatedEvent,
      logger,
      60000,
      overrides,
      snapshotCode,
    );
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Execute push from pre-built bundle
 */
async function executeBundlePush(
  bundleContent: string,
  platform: Platform,
  validatedEvent: { name: string; data: Record<string, unknown> },
  logger: Logger.Instance,
  setTempDir: (dir: string) => void,
  overrides: PushOverrides = {},
  snapshotCode?: string,
): Promise<PushResult> {
  // Write bundle to temp file
  const tempDir = getTmpPath(
    undefined,
    `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  setTempDir(tempDir);
  await fs.ensureDir(tempDir);
  const tempPath = path.join(tempDir, 'bundle.mjs');
  await fs.writeFile(tempPath, bundleContent, 'utf8');

  logger.debug(`Bundle written to: ${tempPath}`);

  // Execute based on platform
  if (platform === 'web') {
    logger.debug('Executing in web environment (JSDOM)');
    return executeWebPush(
      tempPath,
      validatedEvent,
      logger,
      overrides,
      snapshotCode,
    );
  } else {
    logger.debug('Executing in server environment (Node.js)');
    return executeServerPush(
      tempPath,
      validatedEvent,
      logger,
      60000,
      overrides,
      snapshotCode,
    );
  }
}

/**
 * Typed event input for push command
 */
interface PushEventInput {
  name: string;
  data: Record<string, unknown>;
  // Source simulation fields
  content?: unknown;
  trigger?: {
    type?: string;
    options?: unknown;
  };
}

/**
 * Execute push for web platform using JSDOM + ESM import
 */
async function executeWebPush(
  esmPath: string,
  event: PushEventInput,
  logger: Logger.Instance,
  overrides?: PushOverrides,
  snapshotCode?: string,
): Promise<PushResult> {
  const startTime = Date.now();
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously',
    resources: 'usable',
    virtualConsole,
  });

  // Save and inject JSDOM globals before ESM import
  const g = global as unknown as Record<string, unknown>;
  const savedWindow = g.window;
  const savedDocument = g.document;
  const savedNavigator = g.navigator;
  g.window = dom.window;
  g.document = dom.window.document;
  Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });

  try {
    // Eval snapshot in JSDOM context before importing bundle
    if (snapshotCode) {
      logger.debug('Evaluating snapshot in JSDOM');
      dom.window.eval(snapshotCode);
    }

    const fileUrl = pathToFileURL(path.resolve(esmPath)).href;
    const module = await import(`${fileUrl}?t=${Date.now()}`);
    const { wireConfig, startFlow } = module;

    if (typeof wireConfig !== 'function' || typeof startFlow !== 'function') {
      throw new Error(
        'Invalid ESM bundle: missing wireConfig or startFlow exports',
      );
    }

    const config = wireConfig(module.__configData ?? undefined);

    // Apply overrides (disabled/mock/simulate) via direct property assignment
    const { captured, trackingCalls } = applyOverrides(config, overrides || {});

    const result = await startFlow(config);
    if (!result?.collector?.push)
      throw new Error('Invalid bundle: collector missing push');

    logger.info(`Pushing event: ${event.name}`);
    const elbResult = await result.collector.push({
      name: event.name,
      data: event.data,
    });

    // Shutdown collector before cleaning up JSDOM globals
    await result.collector.command('shutdown');

    // Build usage map from tracking calls populated during execution
    const usage: Record<
      string,
      Array<{ fn: string; args: unknown[]; ts: number }>
    > = {};
    for (const { destId, calls } of trackingCalls) {
      if (calls.length > 0) usage[destId] = calls;
    }

    return {
      success: true,
      elbResult: elbResult as PushResult['elbResult'],
      ...(captured.length > 0 ? { captured } : {}),
      ...(Object.keys(usage).length > 0 ? { usage } : {}),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    // Restore globals
    if (savedWindow !== undefined) g.window = savedWindow;
    else delete g.window;
    if (savedDocument !== undefined) g.document = savedDocument;
    else delete g.document;
    if (savedNavigator !== undefined) {
      Object.defineProperty(global, 'navigator', {
        value: savedNavigator,
        configurable: true,
        writable: true,
      });
    } else {
      delete g.navigator;
    }
  }
}

/**
 * Execute push for server platform using direct ESM import
 */
async function executeServerPush(
  esmPath: string,
  event: PushEventInput,
  logger: Logger.Instance,
  timeout: number = 60000,
  overrides?: PushOverrides,
  snapshotCode?: string,
): Promise<PushResult> {
  const startTime = Date.now();
  let timer: ReturnType<typeof setTimeout>;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Server push timeout after ${timeout}ms`)),
        timeout,
      );
    });

    const executePromise = (async () => {
      // Eval snapshot in Node global scope before importing bundle
      if (snapshotCode) {
        logger.debug('Evaluating snapshot in Node');
        const vm = await import('vm');
        vm.runInThisContext(snapshotCode);
      }

      const fileUrl = pathToFileURL(path.resolve(esmPath)).href;
      const module = await import(`${fileUrl}?t=${Date.now()}`);
      const { wireConfig, startFlow } = module;

      if (typeof wireConfig !== 'function' || typeof startFlow !== 'function') {
        throw new Error(
          'Invalid ESM bundle: missing wireConfig or startFlow exports',
        );
      }

      const config = wireConfig(module.__configData ?? undefined);

      // Apply overrides (disabled/mock/simulate) via direct property assignment
      const { captured, trackingCalls } = applyOverrides(
        config,
        overrides || {},
      );

      const result = await startFlow(config);
      if (!result?.collector?.push)
        throw new Error('Invalid bundle: collector missing push');

      logger.info(`Pushing event: ${event.name}`);
      const elbResult = await result.collector.push({
        name: event.name,
        data: event.data,
      });

      // Shutdown collector (closes Express servers, cleans up stores, etc.)
      await result.collector.command('shutdown');

      // Build usage map from tracking calls populated during execution
      const usage: Record<
        string,
        Array<{ fn: string; args: unknown[]; ts: number }>
      > = {};
      for (const { destId, calls } of trackingCalls) {
        if (calls.length > 0) usage[destId] = calls;
      }

      return {
        success: true,
        elbResult: elbResult as PushResult['elbResult'],
        ...(captured.length > 0 ? { captured } : {}),
        ...(Object.keys(usage).length > 0 ? { usage } : {}),
        duration: Date.now() - startTime,
      };
    })();

    return await Promise.race([executePromise, timeoutPromise]);
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Execute source simulation using createTrigger from the source package's /dev export.
 *
 * Instead of startFlow + collector.push (destination path), this calls
 * createTrigger which owns startFlow internally (lazy init). The source's
 * env.push has been replaced by applyOverrides with a capturing wrapper.
 */
async function executeSourceSimulation(
  esmPath: string,
  event: PushEventInput,
  logger: Logger.Instance,
  overrides: PushOverrides,
  createTrigger: (
    ...args: unknown[]
  ) => Promise<{
    trigger: (
      type?: string,
      options?: unknown,
    ) => (content: unknown) => Promise<unknown>;
    flow?: {
      collector?: { command?: (...args: unknown[]) => Promise<unknown> };
    };
  }>,
  platform: 'web' | 'server',
  snapshotCode?: string,
): Promise<PushResult> {
  const startTime = Date.now();
  const g = global as unknown as Record<string, unknown>;
  let savedWindow: unknown, savedDocument: unknown, savedNavigator: unknown;
  let dom: JSDOM | undefined;

  // JSDOM setup for web platform
  if (platform === 'web') {
    const virtualConsole = new VirtualConsole();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole,
    });
    savedWindow = g.window;
    savedDocument = g.document;
    savedNavigator = g.navigator;
    g.window = dom.window;
    g.document = dom.window.document;
    Object.defineProperty(global, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  }

  try {
    // Eval snapshot before importing bundle
    if (snapshotCode) {
      if (platform === 'web' && dom) {
        logger.debug('Evaluating snapshot in JSDOM');
        dom.window.eval(snapshotCode);
      } else {
        logger.debug('Evaluating snapshot in Node');
        const vm = await import('vm');
        vm.runInThisContext(snapshotCode);
      }
    }

    const fileUrl = pathToFileURL(path.resolve(esmPath)).href;
    const module = await import(`${fileUrl}?t=${Date.now()}`);
    const { wireConfig } = module;

    if (typeof wireConfig !== 'function') {
      throw new Error('Invalid ESM bundle: missing wireConfig export');
    }

    const config = wireConfig(module.__configData ?? undefined);
    const { captured, trackingCalls } = applyOverrides(config, overrides);

    // createTrigger receives the full config and calls startFlow internally (lazy)
    const instance = await createTrigger(config);
    const { trigger } = instance;

    logger.info('Simulating source');

    // Fire the trigger — source processes input, calls env.push (captured)
    const content = event.content ?? event;
    const triggerType = event.trigger?.type;
    const triggerOptions = event.trigger?.options;

    await trigger(triggerType, triggerOptions)(content);

    // Shutdown
    if (instance.flow?.collector?.command) {
      await instance.flow.collector.command('shutdown');
    }

    // Build usage map from tracking calls populated during execution
    const usage: Record<
      string,
      Array<{ fn: string; args: unknown[]; ts: number }>
    > = {};
    for (const { destId, calls } of trackingCalls) {
      if (calls.length > 0) usage[destId] = calls;
    }

    return {
      success: true,
      ...(captured.length > 0 ? { captured } : {}),
      ...(Object.keys(usage).length > 0 ? { usage } : {}),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    if (platform === 'web') {
      if (savedWindow !== undefined) g.window = savedWindow;
      else delete g.window;
      if (savedDocument !== undefined) g.document = savedDocument;
      else delete g.document;
      if (savedNavigator !== undefined) {
        Object.defineProperty(global, 'navigator', {
          value: savedNavigator,
          configurable: true,
          writable: true,
        });
      } else {
        delete g.navigator;
      }
    }
  }
}

// Export types
export type { PushCommandOptions, PushResult };
