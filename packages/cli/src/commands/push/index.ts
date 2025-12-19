import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs-extra';
import { getPlatform, type Elb } from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';
import {
  createCommandLogger,
  getErrorMessage,
  type Logger,
} from '../../core/index.js';
import { loadFlowConfig, loadJsonFromSource } from '../../config/index.js';
import { bundleCore } from '../bundle/bundler.js';
import type { PushCommandOptions, PushResult } from './types.js';

/**
 * CLI command handler for push command
 */
export async function pushCommand(options: PushCommandOptions): Promise<void> {
  const logger = createCommandLogger(options);
  const startTime = Date.now();

  try {
    // Step 1: Load event
    logger.debug('Loading event');
    const event = await loadJsonFromSource(options.event, {
      name: 'event',
    });

    // Validate event format using Zod schema
    const eventResult = schemas.PartialEventSchema.safeParse(event);
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

    // Create typed event object for execution
    const validatedEvent: { name: string; data: Record<string, unknown> } = {
      name: parsedEvent.name,
      data: (parsedEvent.data || {}) as Record<string, unknown>,
    };

    // Warn about event naming format (walkerOS business logic)
    if (!validatedEvent.name.includes(' ')) {
      logger.log(
        `Warning: Event name "${validatedEvent.name}" should follow "ENTITY ACTION" format (e.g., "page view")`,
      );
    }

    // Step 2: Load config
    logger.debug('Loading flow configuration');
    const { flowConfig, buildOptions } = await loadFlowConfig(options.config, {
      flowName: options.flow,
      logger,
    });

    const platform = getPlatform(flowConfig);

    // Step 3: Bundle to temp file in config directory (so Node.js can find node_modules)
    logger.debug('Bundling flow configuration');
    // buildOptions.configDir already handles URLs (uses cwd) vs local paths
    const configDir = buildOptions.configDir || process.cwd();
    const tempDir = path.join(
      configDir,
      '.tmp',
      `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.ensureDir(tempDir);
    const tempPath = path.join(
      tempDir,
      `bundle.${platform === 'web' ? 'js' : 'mjs'}`,
    );

    const pushBuildOptions = {
      ...buildOptions,
      output: tempPath,
      // Web uses IIFE for browser-like execution, server uses ESM
      format: platform === 'web' ? ('iife' as const) : ('esm' as const),
      platform: platform === 'web' ? ('browser' as const) : ('node' as const),
      ...(platform === 'web' && {
        windowCollector: 'collector',
        windowElb: 'elb',
      }),
    };

    await bundleCore(flowConfig, pushBuildOptions, logger, false);

    logger.debug(`Bundle created: ${tempPath}`);

    // Step 4: Execute based on platform
    let result: PushResult;

    if (platform === 'web') {
      logger.debug('Executing in web environment (JSDOM)');
      result = await executeWebPush(tempPath, validatedEvent, logger);
    } else if (platform === 'server') {
      logger.debug('Executing in server environment (Node.js)');
      result = await executeServerPush(tempPath, validatedEvent, logger);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Step 5: Output results
    const duration = Date.now() - startTime;

    if (options.json) {
      logger.json({
        success: result.success,
        event: result.elbResult,
        duration,
      });
    } else {
      // Standard output
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

    // Cleanup temp directory
    try {
      await fs.remove(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      logger.json({
        success: false,
        error: errorMessage,
        duration,
      });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }

    process.exit(1);
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

    // Wait for window.elb assignment
    logger.debug('Waiting for elb...');
    await waitForWindowProperty(
      window as unknown as Record<string, unknown>,
      'elb',
      5000,
    );

    const windowObj = window as unknown as Record<string, unknown>;
    const elb = windowObj.elb as unknown as (
      name: string,
      data: Record<string, unknown>,
    ) => Promise<Elb.PushResult>;

    // Push event
    logger.log(`Pushing event: ${event.name}`);
    const elbResult = await elb(event.name, event.data);

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

      // Call factory function to start flow
      logger.debug('Calling factory function...');
      const result = await flowModule.default();

      if (!result || !result.elb || typeof result.elb !== 'function') {
        throw new Error(
          'Factory function did not return valid result with elb',
        );
      }

      const { elb } = result;

      // Push event
      logger.log(`Pushing event: ${event.name}`);
      const elbResult = await (
        elb as (
          name: string,
          data: Record<string, unknown>,
        ) => Promise<Elb.PushResult>
      )(event.name, event.data);

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
