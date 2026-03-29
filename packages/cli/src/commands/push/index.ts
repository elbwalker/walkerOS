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
import { bundleCore } from '../bundle/bundler.js';
import type { PushCommandOptions, PushResult } from './types.js';
import type { PushOptions } from '../../schemas/push.js';
import { buildOverrides, type PushOverrides } from './overrides.js';
import { applyOverrides } from './apply-overrides.js';

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

    if (detected.type === 'config') {
      result = await executeConfigPush(
        {
          config: inputPath,
          flow: options.flow,
          verbose: options.verbose,
        } as PushCommandOptions,
        validatedEvent,
        logger,
        (dir) => {
          tempDir = dir;
        },
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
  options: PushOptions & { flow?: string; platform?: Platform } = {},
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

  // Execute based on platform
  if (platform === 'web') {
    logger.debug('Executing in web environment (JSDOM)');
    return executeWebPush(tempPath, validatedEvent, logger, overrides);
  } else if (platform === 'server') {
    logger.debug('Executing in server environment (Node.js)');
    return executeServerPush(
      tempPath,
      validatedEvent,
      logger,
      60000,
      overrides,
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
    return executeWebPush(tempPath, validatedEvent, logger, overrides);
  } else {
    logger.debug('Executing in server environment (Node.js)');
    return executeServerPush(
      tempPath,
      validatedEvent,
      logger,
      60000,
      overrides,
    );
  }
}

/**
 * Typed event input for push command
 */
interface PushEventInput {
  name: string;
  data: Record<string, unknown>;
}

/**
 * Execute push for web platform using JSDOM + ESM import
 */
async function executeWebPush(
  esmPath: string,
  event: PushEventInput,
  logger: Logger.Instance,
  overrides?: PushOverrides,
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
  const savedWindow = (global as any).window;
  const savedDocument = (global as any).document;
  (global as any).window = dom.window;
  (global as any).document = dom.window.document;

  try {
    const fileUrl = pathToFileURL(path.resolve(esmPath)).href;
    const module = await import(`${fileUrl}?t=${Date.now()}`);
    const { wireConfig, startFlow } = module;

    if (typeof wireConfig !== 'function' || typeof startFlow !== 'function') {
      throw new Error(
        'Invalid ESM bundle: missing wireConfig or startFlow exports',
      );
    }

    const config = wireConfig();

    // Apply overrides (disabled/mock) via direct property assignment
    applyOverrides(config, overrides || {});

    const result = await startFlow(config);
    if (!result?.collector?.push)
      throw new Error('Invalid bundle: collector missing push');

    logger.info(`Pushing event: ${event.name}`);
    const elbResult = await result.collector.push({
      name: event.name,
      data: event.data,
    });

    return {
      success: true,
      elbResult: elbResult as PushResult['elbResult'],
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
    if (savedWindow !== undefined) (global as any).window = savedWindow;
    else delete (global as any).window;
    if (savedDocument !== undefined) (global as any).document = savedDocument;
    else delete (global as any).document;
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
      const fileUrl = pathToFileURL(path.resolve(esmPath)).href;
      const module = await import(`${fileUrl}?t=${Date.now()}`);
      const { wireConfig, startFlow } = module;

      if (typeof wireConfig !== 'function' || typeof startFlow !== 'function') {
        throw new Error(
          'Invalid ESM bundle: missing wireConfig or startFlow exports',
        );
      }

      const config = wireConfig();

      // Apply overrides (disabled/mock) via direct property assignment
      applyOverrides(config, overrides || {});

      const result = await startFlow(config);
      if (!result?.collector?.push)
        throw new Error('Invalid bundle: collector missing push');

      logger.info(`Pushing event: ${event.name}`);
      const elbResult = await result.collector.push({
        name: event.name,
        data: event.data,
      });

      return {
        success: true,
        elbResult: elbResult as PushResult['elbResult'],
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

// Export types
export type { PushCommandOptions, PushResult };
