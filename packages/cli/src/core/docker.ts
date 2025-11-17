/**
 * Docker Execution Utilities
 *
 * Handles Docker container execution for CLI commands.
 */

import { spawn } from 'child_process';
import path from 'path';
import type { GlobalOptions } from '../types/global';

/**
 * Docker image to use for CLI execution
 */
export const DOCKER_IMAGE =
  process.env.WALKEROS_DOCKER_IMAGE || 'walkeros/cli:latest';

/**
 * Build Docker command for executing CLI commands
 *
 * @param command - CLI command (bundle, simulate, run)
 * @param args - Command arguments
 * @param options - Global options
 * @returns Docker command array
 */
export function buildDockerCommand(
  command: string,
  args: string[],
  options: GlobalOptions = {},
): string[] {
  const cwd = process.cwd();

  const cmd = [
    'docker',
    'run',
    '--rm',
    // Mount current directory
    '-v',
    `${cwd}:/workspace`,
    '-w',
    '/workspace',
  ];

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

  // Add the Docker image
  cmd.push(DOCKER_IMAGE);

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
 * @returns Promise that resolves when command completes
 */
export async function executeInDocker(
  command: string,
  args: string[],
  options: GlobalOptions = {},
): Promise<void> {
  const dockerCmd = buildDockerCommand(command, args, options);

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
  image: string = DOCKER_IMAGE,
): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('docker', ['image', 'inspect', image], {
      stdio: 'ignore',
    });

    proc.on('error', () => resolve(false));
    proc.on('exit', (code) => resolve(code === 0));
  });
}
