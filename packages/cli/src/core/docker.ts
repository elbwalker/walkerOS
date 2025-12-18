/**
 * Docker Execution Utilities
 *
 * Handles Docker container execution for CLI commands.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { VERSION as DOCKER_VERSION } from '@walkeros/docker';
import { VERSION as CLI_VERSION } from '../version.js';
import { isUrl, downloadFromUrl } from '../config/utils.js';
import type { GlobalOptions } from '../types/global.js';

/**
 * Docker image for CLI/build tools (bundle, simulate)
 * Uses explicit version by default, can be overridden with env var
 */
export const CLI_DOCKER_IMAGE =
  process.env.WALKEROS_CLI_DOCKER_IMAGE || `walkeros/cli:${CLI_VERSION}`;

/**
 * Docker image for production runtime (run command)
 * Uses explicit version by default, can be overridden with env var
 */
export const RUNTIME_DOCKER_IMAGE =
  process.env.WALKEROS_RUNTIME_DOCKER_IMAGE ||
  `walkeros/docker:${DOCKER_VERSION}`;

/**
 * @deprecated Use CLI_DOCKER_IMAGE or RUNTIME_DOCKER_IMAGE instead
 */
export const DOCKER_IMAGE = CLI_DOCKER_IMAGE;

/**
 * Build common Docker arguments from CLI options
 *
 * Extracts common flags (config, json, verbose, silent) that are shared
 * across bundle and simulate commands. Command-specific flags should be
 * added after calling this function.
 *
 * @param options - CLI options containing common flags
 * @returns Array of command-line arguments starting with config path
 */
export function buildCommonDockerArgs(options: {
  config: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
}): string[] {
  const args = [options.config];

  // Common flags
  if (options.json) args.push('--json');
  if (options.verbose) args.push('--verbose');
  if (options.silent) args.push('--silent');

  return args;
}

/**
 * Build Docker command for executing CLI commands
 *
 * @param command - CLI command (bundle, simulate, run)
 * @param args - Command arguments
 * @param options - Global options
 * @param configFile - Optional config file path to mount in Docker
 * @returns Docker command array
 */
export function buildDockerCommand(
  command: string,
  args: string[],
  options: GlobalOptions = {},
  configFile?: string,
): string[] {
  const cwd = process.cwd();

  const cmd = ['docker', 'run', '--rm'];

  // Mount config file if provided (only for local files, not URLs)
  if (configFile && !isUrl(configFile)) {
    const configPath = path.resolve(cwd, configFile);

    // Mount config file at /config/flow.json (read-only, separate from workspace)
    cmd.push('-v', `${configPath}:/config/flow.json:ro`);

    // Update args to use container path - replace first occurrence of config file path
    args = args.map((arg) => (arg === configFile ? '/config/flow.json' : arg));
  }
  // For URLs, pass them through as-is - container will download them

  // Mount current directory for output files
  cmd.push('-v', `${cwd}:/workspace`);
  cmd.push('-w', '/workspace');

  // Add user mapping on Linux/Mac to prevent permission issues
  if (process.platform !== 'win32') {
    try {
      const uid = process.getuid?.();
      const gid = process.getgid?.();
      if (uid !== undefined && gid !== undefined) {
        cmd.push('--user', `${uid}:${gid}`);
      }
    } catch {
      // Ignore if not available
    }
  }

  // Pass through environment variables
  if (options.verbose) {
    cmd.push('-e', 'VERBOSE=true');
  }
  if (options.silent) {
    cmd.push('-e', 'SILENT=true');
  }

  // Add the Docker image (CLI tools for bundle/simulate)
  cmd.push(CLI_DOCKER_IMAGE);

  // Add the command and arguments
  cmd.push(command, ...args);

  return cmd;
}

/**
 * Execute command in Docker container
 *
 * For remote URLs, downloads the config to a temp file first since Docker
 * containers can't access URLs directly via volume mounting.
 *
 * @param command - CLI command
 * @param args - Command arguments
 * @param options - Global options
 * @param configFile - Optional config file path or URL to mount in Docker
 * @returns Promise that resolves when command completes
 */
export async function executeInDocker(
  command: string,
  args: string[],
  options: GlobalOptions = {},
  configFile?: string,
): Promise<void> {
  let tempFile: string | undefined;
  let effectiveConfigFile = configFile;

  try {
    // Pre-download URL configs to temp file for Docker mounting
    // Docker can only mount local files, not remote URLs
    if (configFile && isUrl(configFile)) {
      tempFile = await downloadFromUrl(configFile);
      effectiveConfigFile = tempFile;
    }

    // Force --local execution inside container to prevent nested Docker attempts
    // Architecture: Host CLI decides environment (Docker vs local),
    // Container CLI always executes locally (no Docker-in-Docker)
    const containerArgs = [...args, '--local'];

    const dockerCmd = buildDockerCommand(
      command,
      containerArgs,
      options,
      effectiveConfigFile,
    );

    return await new Promise((resolve, reject) => {
      const proc = spawn(dockerCmd[0], dockerCmd.slice(1), {
        stdio: options.silent ? 'ignore' : 'inherit',
        shell: false,
      });

      proc.on('error', (error) => {
        reject(new Error(`Docker execution failed: ${error.message}`));
      });

      proc.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Docker already logged the error via stdio inherit
          // Just exit with same code - no duplicate message
          process.exit(code || 1);
        }
      });
    });
  } finally {
    // Clean up temp file if we created one
    if (tempFile) {
      try {
        await fs.remove(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Check if Docker is available
 *
 * @returns Promise resolving to true if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('docker', ['--version'], {
      stdio: 'ignore',
    });

    proc.on('error', () => resolve(false));
    proc.on('exit', (code) => resolve(code === 0));
  });
}

/**
 * Check if Docker image exists locally
 *
 * @param image - Docker image name
 * @returns Promise resolving to true if image exists
 */
export async function imageExists(
  image: string = CLI_DOCKER_IMAGE,
): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('docker', ['image', 'inspect', image], {
      stdio: 'ignore',
    });

    proc.on('error', () => resolve(false));
    proc.on('exit', (code) => resolve(code === 0));
  });
}

/**
 * Build Docker command for run command (production runtime)
 *
 * @param mode - Run mode (collect | serve)
 * @param flowPath - Path to pre-built .mjs bundle (for collect mode) or custom file (for serve mode)
 * @param options - Runtime options
 * @returns Docker command array
 */
export function buildDockerRunCommand(
  mode: 'collect' | 'serve',
  flowPath: string | null,
  options: {
    port?: number;
    host?: string;
    serveName?: string;
    servePath?: string;
  } = {},
): string[] {
  const cwd = process.cwd();
  const cmd = ['docker', 'run', '--rm'];

  // Set MODE environment variable
  cmd.push('-e', `MODE=${mode}`);

  // Mount entire dist folder for collect mode (includes bundle + shared folders)
  // Must mount to /app/dist (not /app) to preserve container's node_modules
  // This allows relative paths like ./shared/credentials/sa.json to work
  if (mode === 'collect' && flowPath) {
    const absoluteFlowPath = path.resolve(cwd, flowPath);
    const flowDir = path.dirname(absoluteFlowPath);
    const flowFile = path.basename(absoluteFlowPath);
    cmd.push('-v', `${flowDir}:/app/dist:ro`);
    cmd.push('-e', `FLOW=/app/dist/${flowFile}`);
  }

  // Mount custom file for serve mode
  if (mode === 'serve' && flowPath) {
    const absoluteFilePath = path.resolve(cwd, flowPath);
    cmd.push('-v', `${absoluteFilePath}:/app/bundle.mjs:ro`);
    cmd.push('-e', 'FILE_PATH=/app/bundle.mjs');
  }

  // Port mapping - always map port for serve mode, use default if not specified
  const port = options.port !== undefined ? options.port : 8080;
  cmd.push('-p', `${port}:${port}`);
  cmd.push('-e', `PORT=${port}`);

  // Host
  if (options.host) {
    cmd.push('-e', `HOST=${options.host}`);
  }

  // Serve name (filename in URL)
  if (options.serveName) {
    cmd.push('-e', `SERVE_NAME=${options.serveName}`);
  }

  // Serve path (URL directory path)
  if (options.servePath) {
    cmd.push('-e', `SERVE_PATH=${options.servePath}`);
  }

  // Add user mapping on Linux/Mac to prevent permission issues
  if (process.platform !== 'win32') {
    try {
      const uid = process.getuid?.();
      const gid = process.getgid?.();
      if (uid !== undefined && gid !== undefined) {
        cmd.push('--user', `${uid}:${gid}`);
      }
    } catch {
      // Ignore if not available
    }
  }

  // Add the runtime Docker image
  cmd.push(RUNTIME_DOCKER_IMAGE);

  return cmd;
}

/**
 * Execute run command in Docker container (production runtime)
 *
 * @param mode - Run mode (collect | serve)
 * @param flowPath - Path to pre-built .mjs bundle (for collect mode) or custom file (for serve mode)
 * @param options - Runtime and global options
 * @returns Promise that resolves when command completes
 */
export async function executeRunInDocker(
  mode: 'collect' | 'serve',
  flowPath: string | null,
  options: {
    port?: number;
    host?: string;
    serveName?: string;
    servePath?: string;
    silent?: boolean;
  } = {},
): Promise<void> {
  const dockerCmd = buildDockerRunCommand(mode, flowPath, options);

  return new Promise((resolve, reject) => {
    const proc = spawn(dockerCmd[0], dockerCmd.slice(1), {
      stdio: options.silent ? 'ignore' : 'inherit',
      shell: false,
    });

    proc.on('error', (error) => {
      reject(new Error(`Docker execution failed: ${error.message}`));
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Docker already logged the error via stdio inherit
        // Just exit with same code - no duplicate message
        process.exit(code || 1);
      }
    });
  });
}
