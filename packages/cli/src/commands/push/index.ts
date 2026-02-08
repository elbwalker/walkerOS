import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs-extra';
import {
  getPlatform,
  type Elb,
  type Logger as CoreLogger,
} from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';
import {
  createCommandLogger,
  createCollectorLoggerConfig,
  getErrorMessage,
  detectInput,
  type Logger,
  type Platform,
} from '../../core/index.js';
import { loadFlowConfig, loadJsonFromSource } from '../../config/index.js';
import { bundleCore } from '../bundle/bundler.js';
import type { PushCommandOptions, PushResult } from './types.js';

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
  const logger = createCommandLogger({
    silent: options.silent,
    verbose: options.verbose,
  });
  const startTime = Date.now();
  let tempDir: string | undefined;

  try {
    // Load event if string (file path or URL)
    let loadedEvent = event;
    if (typeof event === 'string') {
      loadedEvent = await loadJsonFromSource(event, { name: 'event' });
    }

    // Validate event format using Zod schema
    const eventResult = schemas.PartialEventSchema.safeParse(loadedEvent);
    if (!eventResult.success) {
      const errors = eventResult.error.issues
        .map((issue) => `${String(issue.path.join('.'))}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid event: ${errors}`);
    }

    const parsedEvent = eventResult.data as {
      name?: string;
      data?: Record<string, unknown>;
    };
    if (!parsedEvent.name) {
      throw new Error('Invalid event: Missing required "name" property');
    }

    const validatedEvent: { name: string; data: Record<string, unknown> } = {
      name: parsedEvent.name,
      data: (parsedEvent.data || {}) as Record<string, unknown>,
    };

    if (!validatedEvent.name.includes(' ')) {
      logger.log(
        `Warning: Event name "${validatedEvent.name}" should follow "ENTITY ACTION" format (e.g., "page view")`,
      );
    }

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
      const collectorLoggerConfig = createCollectorLoggerConfig(
        logger,
        options.verbose,
      );
      result = await executeBundlePush(
        detected.content,
        detected.platform,
        validatedEvent,
        logger,
        (dir) => {
          tempDir = dir;
        },
        { logger: collectorLoggerConfig },
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
  const logger = createCommandLogger(options);
  const startTime = Date.now();

  try {
    const event = await loadJsonFromSource(options.event, { name: 'event' });

    const result = await pushCore(options.config, event, {
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
      platform: options.platform,
    });

    const duration = Date.now() - startTime;

    if (options.json) {
      logger.json({
        success: result.success,
        event: result.elbResult,
        duration,
      });
    } else {
      if (result.success) {
        logger.log('Event pushed successfully');
        if (result.elbResult && typeof result.elbResult === 'object') {
          const pushResult = result.elbResult as unknown as Record<
            string,
            unknown
          >;
          if ('id' in pushResult && pushResult.id) {
            logger.log(`  Event ID: ${pushResult.id}`);
          }
          if ('entity' in pushResult && pushResult.entity) {
            logger.log(`  Entity: ${pushResult.entity}`);
          }
          if ('action' in pushResult && pushResult.action) {
            logger.log(`  Action: ${pushResult.action}`);
          }
        }
        logger.log(`  Duration: ${duration}ms`);
      } else {
        logger.error(`Error: ${result.error}`);
        process.exit(1);
      }
    }

    // Explicit exit on success to avoid hanging from open handles
    // (JSDOM instances, esbuild workers, HTTP connections, etc.)
    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      logger.json({ success: false, error: errorMessage, duration });
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
  options: {
    silent?: boolean;
    verbose?: boolean;
    json?: boolean;
  } = {},
): Promise<PushResult> {
  if (typeof configOrPath !== 'string') {
    throw new Error(
      'push() currently only supports config file paths. ' +
        'Config object support will be added in a future version. ' +
        'Please provide a path to a configuration file.',
    );
  }

  return await pushCore(configOrPath, event, {
    json: options.json ?? false,
    verbose: options.verbose ?? false,
  });
}

/**
 * Execute push from config JSON (existing behavior)
 */
async function executeConfigPush(
  options: PushCommandOptions,
  validatedEvent: { name: string; data: Record<string, unknown> },
  logger: Logger,
  setTempDir: (dir: string) => void,
): Promise<PushResult> {
  // Load config
  logger.debug('Loading flow configuration');
  const { flowConfig, buildOptions } = await loadFlowConfig(options.config, {
    flowName: options.flow,
    logger,
  });

  const platform = getPlatform(flowConfig);

  // Bundle to temp file in config directory (so Node.js can find node_modules)
  logger.debug('Bundling flow configuration');
  const configDir = buildOptions.configDir || process.cwd();
  const tempDir = path.join(
    configDir,
    '.tmp',
    `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  setTempDir(tempDir);
  await fs.ensureDir(tempDir);
  const tempPath = path.join(
    tempDir,
    `bundle.${platform === 'web' ? 'js' : 'mjs'}`,
  );

  const pushBuildOptions = {
    ...buildOptions,
    output: tempPath,
    format: platform === 'web' ? ('iife' as const) : ('esm' as const),
    platform: platform === 'web' ? ('browser' as const) : ('node' as const),
    ...(platform === 'web' && {
      windowCollector: 'collector',
      windowElb: 'elb',
    }),
  };

  await bundleCore(flowConfig, pushBuildOptions, logger, false);

  logger.debug(`Bundle created: ${tempPath}`);

  // Execute based on platform
  if (platform === 'web') {
    logger.debug('Executing in web environment (JSDOM)');
    return executeWebPush(tempPath, validatedEvent, logger);
  } else if (platform === 'server') {
    logger.debug('Executing in server environment (Node.js)');
    const collectorLoggerConfig = createCollectorLoggerConfig(
      logger,
      options.verbose,
    );
    return executeServerPush(tempPath, validatedEvent, logger, 60000, {
      logger: collectorLoggerConfig,
    });
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
  logger: Logger,
  setTempDir: (dir: string) => void,
  context: { logger?: CoreLogger.Config } = {},
): Promise<PushResult> {
  // Write bundle to temp file
  const tempDir = path.join(
    process.cwd(),
    '.tmp',
    `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  setTempDir(tempDir);
  await fs.ensureDir(tempDir);
  const tempPath = path.join(
    tempDir,
    `bundle.${platform === 'server' ? 'mjs' : 'js'}`,
  );
  await fs.writeFile(tempPath, bundleContent, 'utf8');

  logger.debug(`Bundle written to: ${tempPath}`);

  // Execute based on platform
  if (platform === 'web') {
    logger.debug('Executing in web environment (JSDOM)');
    return executeWebPush(tempPath, validatedEvent, logger);
  } else {
    logger.debug('Executing in server environment (Node.js)');
    return executeServerPush(tempPath, validatedEvent, logger, 60000, context);
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
 * Execute push for web platform using JSDOM with real APIs
 */
async function executeWebPush(
  bundlePath: string,
  event: PushEventInput,
  logger: Logger,
): Promise<PushResult> {
  const startTime = Date.now();

  try {
    // Create JSDOM with silent console
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole,
    });

    const { window } = dom;

    // JSDOM provides fetch natively, no need to inject node-fetch

    // Load and execute bundle
    logger.debug('Loading bundle...');
    const bundleCode = await fs.readFile(bundlePath, 'utf8');
    window.eval(bundleCode);

    // Wait for window.collector assignment
    logger.debug('Waiting for collector...');
    await waitForWindowProperty(
      window as unknown as Record<string, unknown>,
      'collector',
      5000,
    );

    const windowObj = window as unknown as Record<string, unknown>;
    const collector = windowObj.collector as unknown as {
      push: (event: {
        name: string;
        data: Record<string, unknown>;
      }) => Promise<Elb.PushResult>;
    };

    // Push event directly to collector (bypasses source handlers)
    logger.log(`Pushing event: ${event.name}`);
    const elbResult = await collector.push({
      name: event.name,
      data: event.data,
    });

    return {
      success: true,
      elbResult,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Execute push for server platform using Node.js
 */
async function executeServerPush(
  bundlePath: string,
  event: PushEventInput,
  logger: Logger,
  timeout: number = 60000, // 60 second default timeout
  context: { logger?: CoreLogger.Config } = {},
): Promise<PushResult> {
  const startTime = Date.now();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Server push timeout after ${timeout}ms`)),
        timeout,
      );
    });

    // Execute with timeout
    const executePromise = (async () => {
      // Dynamic import of ESM bundle
      logger.debug('Importing bundle...');
      const flowModule = await import(bundlePath);

      if (!flowModule.default || typeof flowModule.default !== 'function') {
        throw new Error('Bundle does not export default factory function');
      }

      // Call factory function to start flow (pass context for verbose logging)
      logger.debug('Calling factory function...');
      const result = await flowModule.default(context);

      if (
        !result ||
        !result.collector ||
        typeof result.collector.push !== 'function'
      ) {
        throw new Error(
          'Factory function did not return valid result with collector',
        );
      }

      const { collector } = result;

      // Push event directly to collector (bypasses source handlers)
      logger.log(`Pushing event: ${event.name}`);
      const elbResult = await collector.push({
        name: event.name,
        data: event.data,
      });

      return {
        success: true,
        elbResult,
        duration: Date.now() - startTime,
      };
    })();

    // Race between execution and timeout
    return await Promise.race([executePromise, timeoutPromise]);
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Wait for window property to be assigned
 */
function waitForWindowProperty(
  window: Record<string, unknown>,
  prop: string,
  timeout: number = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (window[prop] !== undefined) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(
          new Error(
            `Timeout waiting for window.${prop}. IIFE may have failed to execute.`,
          ),
        );
      } else {
        setImmediate(check);
      }
    };

    check();
  });
}

// Export types
export type { PushCommandOptions, PushResult };
