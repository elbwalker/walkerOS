import path from 'path';
import os from 'os';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs-extra';
import { getPlatform, type Elb } from '@walkeros/core';
import {
  createCommandLogger,
  createLogger,
  executeCommand,
  getErrorMessage,
  buildCommonDockerArgs,
  type Logger,
} from '../../core/index.js';
import {
  loadJsonConfig,
  loadJsonFromSource,
  loadBundleConfig,
} from '../../config/index.js';
import { bundle } from '../bundle/index.js';
import type { PushCommandOptions, PushResult } from './types.js';

/**
 * CLI command handler for push command
 */
export async function pushCommand(options: PushCommandOptions): Promise<void> {
  const logger = createCommandLogger(options);

  // Build Docker args
  const dockerArgs = buildCommonDockerArgs(options);
  dockerArgs.push('--event', options.event);
  if (options.flow) dockerArgs.push('--flow', options.flow);

  await executeCommand(
    async () => {
      const startTime = Date.now();

      try {
        // Step 1: Load event
        logger.info('📥 Loading event...');
        const event = await loadJsonFromSource(options.event, {
          name: 'event',
        });

        // Validate event format
        if (
          !event ||
          typeof event !== 'object' ||
          !('name' in event) ||
          typeof event.name !== 'string'
        ) {
          throw new Error(
            'Event must be an object with a "name" property (string)',
          );
        }

        // Warn about event naming format
        if (!event.name.includes(' ')) {
          logger.warn(
            `Event name "${event.name}" should follow "ENTITY ACTION" format (e.g., "page view")`,
          );
        }

        // Step 2: Load config
        logger.info('📦 Loading flow configuration...');
        const configPath = path.resolve(options.config);
        const rawConfig = await loadJsonConfig(configPath);
        const { flowConfig, buildOptions, flowName, isMultiFlow } =
          loadBundleConfig(rawConfig, {
            configPath: options.config,
            flowName: options.flow,
            logger,
          });

        const platform = getPlatform(flowConfig);

        // Step 3: Bundle to temp file
        logger.info('🔨 Bundling flow configuration...');
        const tempPath = path.join(
          os.tmpdir(),
          `walkeros-push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${platform === 'web' ? 'js' : 'mjs'}`,
        );

        const configWithOutput = {
          flow: flowConfig,
          build: {
            ...buildOptions,
            output: tempPath,
            // Web uses IIFE for browser-like execution, server uses ESM
            format: platform === 'web' ? ('iife' as const) : ('esm' as const),
            platform:
              platform === 'web' ? ('browser' as const) : ('node' as const),
            ...(platform === 'web' && {
              windowCollector: 'collector',
              windowElb: 'elb',
            }),
          },
        };

        await bundle(configWithOutput, {
          cache: true,
          verbose: options.verbose,
          silent: !options.verbose,
        });

        logger.debug(`Bundle created: ${tempPath}`);

        // Step 4: Execute based on platform
        let result: PushResult;

        if (platform === 'web') {
          logger.info('🌐 Executing in web environment (JSDOM)...');
          result = await executeWebPush(tempPath, event, logger);
        } else if (platform === 'server') {
          logger.info('🖥️  Executing in server environment (Node.js)...');
          result = await executeServerPush(tempPath, event, logger);
        } else {
          throw new Error(`Unsupported platform: ${platform}`);
        }

        // Step 5: Output results
        const duration = Date.now() - startTime;

        if (options.json) {
          // JSON output
          const outputLogger = createLogger({ silent: false, json: false });
          outputLogger.log(
            'white',
            JSON.stringify(
              {
                success: result.success,
                event: result.elbResult,
                duration,
              },
              null,
              2,
            ),
          );
        } else {
          // Standard output
          if (result.success) {
            logger.success('✅ Event pushed successfully');
            if (result.elbResult && typeof result.elbResult === 'object') {
              const pushResult = result.elbResult as unknown as Record<
                string,
                unknown
              >;
              if ('id' in pushResult && pushResult.id) {
                logger.info(`   Event ID: ${pushResult.id}`);
              }
              if ('entity' in pushResult && pushResult.entity) {
                logger.info(`   Entity: ${pushResult.entity}`);
              }
              if ('action' in pushResult && pushResult.action) {
                logger.info(`   Action: ${pushResult.action}`);
              }
            }
            logger.info(`   Duration: ${duration}ms`);
          } else {
            logger.error(`❌ Push failed: ${result.error}`);
            process.exit(1);
          }
        }

        // Cleanup
        try {
          await fs.remove(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = getErrorMessage(error);

        if (options.json) {
          const outputLogger = createLogger({ silent: false, json: false });
          outputLogger.log(
            'white',
            JSON.stringify(
              {
                success: false,
                error: errorMessage,
                duration,
              },
              null,
              2,
            ),
          );
        } else {
          logger.error(`❌ Push command failed: ${errorMessage}`);
        }

        process.exit(1);
      }
    },
    'push',
    dockerArgs,
    options,
    logger,
    options.config,
  );
}

/**
 * Execute push for web platform using JSDOM with real APIs
 */
async function executeWebPush(
  bundlePath: string,
  event: Record<string, unknown>,
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
    logger.info(`Pushing event: ${event.name}`);
    const eventData = (event.data || {}) as Record<string, unknown>;
    const elbResult = await elb(event.name as string, eventData);

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
  event: Record<string, unknown>,
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
      logger.info(`Pushing event: ${event.name}`);
      const eventData = (event.data || {}) as Record<string, unknown>;
      const elbResult = await (
        elb as (
          name: string,
          data: Record<string, unknown>,
        ) => Promise<Elb.PushResult>
      )(event.name as string, eventData);

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
