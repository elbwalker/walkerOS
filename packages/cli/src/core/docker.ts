/**
 * Docker Execution Utilities
 *
 * Handles Docker container execution for CLI commands.
 */

import { spawn } from 'child_process';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { VERSION as DOCKER_VERSION } from '@walkeros/docker';
import { isUrl } from '../config/utils';
import type { GlobalOptions } from '../types/global';

// Get the directory of this module (ESM-compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read CLI version from own package.json
// Handle both development (src/) and production (dist/) paths
function readPackageVersion(): string {
  // Try production path first (dist/index.js -> ../package.json)
  const prodPath = path.join(__dirname, '../package.json');
  try {
    const pkg = JSON.parse(readFileSync(prodPath, 'utf-8')) as {
      version: string;
    };
    return pkg.version;
  } catch {
    // Fall back to development path (src/core/docker.ts -> ../../package.json)
    const devPath = path.join(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(devPath, 'utf-8')) as {
      version: string;
    };
    return pkg.version;
  }
}

const CLI_VERSION = readPackageVersion();

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
 * @param command - CLI command
 * @param args - Command arguments
 * @param options - Global options
 * @param configFile - Optional config file path to mount in Docker
 * @returns Promise that resolves when command completes
 */
export async function executeInDocker(
  command: string,
  args: string[],
  options: GlobalOptions = {},
  configFile?: string,
): Promise<void> {
  // Force --local execution inside container to prevent nested Docker attempts
  // Architecture: Host CLI decides environment (Docker vs local),
  // Container CLI always executes locally (no Docker-in-Docker)
  const containerArgs = [...args, '--local'];

  const dockerCmd = buildDockerCommand(
    command,
    containerArgs,
    options,
    configFile,
  );

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
        reject(new Error(`Docker command exited with code ${code}`));
      }
    });
  });
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
 * @param flowPath - Path to pre-built .mjs bundle (for collect mode)
 * @param options - Runtime options
 * @returns Docker command array
 */
export function buildDockerRunCommand(
  mode: 'collect' | 'serve',
  flowPath: string | null,
  options: {
    port?: number;
    host?: string;
    staticDir?: string;
  } = {},
): string[] {
  const cwd = process.cwd();
  const cmd = ['docker', 'run', '--rm'];

  // Set MODE environment variable
  cmd.push('-e', `MODE=${mode}`);

  // Mount flow bundle for collect mode
  if (mode === 'collect' && flowPath) {
    const absoluteFlowPath = path.resolve(cwd, flowPath);
    cmd.push('-v', `${absoluteFlowPath}:/app/flow.mjs:ro`);
    cmd.push('-e', 'FLOW=/app/flow.mjs');
  }

  // Port mapping
  if (options.port !== undefined) {
    cmd.push('-p', `${options.port}:${options.port}`);
    cmd.push('-e', `PORT=${options.port}`);
  }

  // Host
  if (options.host) {
    cmd.push('-e', `HOST=${options.host}`);
  }

  // Static directory for serve mode
  if (mode === 'serve' && options.staticDir) {
    const absoluteStaticDir = path.resolve(cwd, options.staticDir);
    cmd.push('-v', `${absoluteStaticDir}:/app/dist:ro`);
    cmd.push('-e', 'STATIC_DIR=/app/dist');
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
 * @param flowPath - Path to pre-built .mjs bundle (for collect mode)
 * @param options - Runtime and global options
 * @returns Promise that resolves when command completes
 */
export async function executeRunInDocker(
  mode: 'collect' | 'serve',
  flowPath: string | null,
  options: {
    port?: number;
    host?: string;
    staticDir?: string;
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
        reject(new Error(`Docker command exited with code ${code}`));
      }
    });
  });
}
