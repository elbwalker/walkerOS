/**
 * Entry point for walkeros/flow Docker container
 * Reads environment variables and starts the appropriate mode
 */

import { runFlow } from './runner.js';
import { runServeMode } from './serve.js';
import { resolveBundle } from './resolve-bundle.js';
import { registerRuntime } from './register.js';
import { createLogger } from '../core/logger.js';
import type { Logger } from '@walkeros/core';

/**
 * Adapt CLI logger to core Logger.Instance interface
 */
function adaptLogger(
  cliLogger: ReturnType<typeof createLogger>,
): Logger.Instance {
  return {
    error: (message: string | Error) => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.error(msg);
    },
    info: (message: string | Error) => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.info(msg);
    },
    debug: (message: string | Error) => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.debug(msg);
    },
    throw: (message: string | Error): never => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.error(msg);
      throw message instanceof Error ? message : new Error(msg);
    },
    scope: (name: string) => {
      // Simple pass-through for scoped loggers - CLI logger doesn't use scopes
      return adaptLogger(cliLogger);
    },
  };
}

async function main() {
  const mode = process.env.MODE || 'collect';
  let bundleEnv = process.env.BUNDLE || '/app/flow/bundle.mjs';
  const port = parseInt(process.env.PORT || '8080', 10);

  const cliLogger = createLogger({ silent: false, verbose: true });
  const logger = adaptLogger(cliLogger);

  cliLogger.log(`Starting walkeros/flow in ${mode} mode`);

  // If registration env vars are set, register and get fresh bundle URL
  const appUrl = process.env.APP_URL;
  const deployToken = process.env.DEPLOY_TOKEN;
  const projectId = process.env.PROJECT_ID;
  const flowId = process.env.FLOW_ID;
  const bundlePath = process.env.BUNDLE_PATH;

  if (appUrl && deployToken && projectId && flowId && bundlePath) {
    try {
      cliLogger.log('Registering with app...');
      const result = await registerRuntime({
        appUrl,
        deployToken,
        projectId,
        flowId,
        bundlePath,
      });
      bundleEnv = result.bundleUrl;
      cliLogger.log('Registered, bundle URL received');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      cliLogger.error(`Registration failed: ${message}`);
      process.exit(1);
    }
  }

  // Resolve bundle from stdin, URL, or file path
  let file: string;
  try {
    const resolved = await resolveBundle(bundleEnv);
    file = resolved.path;

    // Log which input method was used
    if (resolved.source === 'stdin') {
      cliLogger.log('Bundle: received via stdin pipe');
    } else if (resolved.source === 'url') {
      cliLogger.log(`Bundle: fetched from ${bundleEnv}`);
    } else {
      cliLogger.log(`Bundle: ${file}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    cliLogger.error(`Failed to resolve bundle: ${message}`);
    process.exit(1);
  }

  cliLogger.log(`Port: ${port}`);

  try {
    if (mode === 'collect') {
      await runFlow(file, { port }, logger);
    } else if (mode === 'serve') {
      await runServeMode({ file, port }, logger);
    } else {
      cliLogger.error(`Unknown mode: ${mode}. Use 'collect' or 'serve'.`);
      process.exit(1);
    }
  } catch (error) {
    cliLogger.error(`Failed to start: ${error}`);
    process.exit(1);
  }
}

main();
