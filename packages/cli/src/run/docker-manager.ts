/**
 * Docker Manager
 *
 * Handles Docker availability checks, image management, and container cleanup
 */

import { execSync } from 'child_process';
import type { DockerCheckResult } from './types';

/**
 * Checks if Docker is installed and running
 *
 * @returns Docker availability status
 */
export function checkDocker(): DockerCheckResult {
  // Check if Docker is installed
  try {
    execSync('docker --version', { stdio: 'pipe' });
  } catch {
    return {
      installed: false,
      running: false,
      error:
        'Docker not found\n' +
        '   Install Docker: https://docs.docker.com/get-docker/',
    };
  }

  // Check if Docker daemon is running
  try {
    execSync('docker info', { stdio: 'pipe' });
  } catch {
    return {
      installed: true,
      running: false,
      error:
        'Docker daemon not running\n' +
        '   Start Docker Desktop or run: sudo systemctl start docker',
    };
  }

  return {
    installed: true,
    running: true,
  };
}

/**
 * Pulls Docker image if it doesn't exist locally
 *
 * @param image - Docker image name (e.g., 'walkeros/docker:latest')
 * @param verbose - Enable verbose output
 * @throws Error if pull fails
 */
export async function pullImageIfNeeded(
  image: string,
  verbose: boolean = false,
): Promise<void> {
  // Check if image exists locally
  try {
    execSync(`docker image inspect ${image}`, { stdio: 'pipe' });
    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`✅ Docker image found locally: ${image}`);
    }
    return;
  } catch {
    // Image doesn't exist, need to pull
  }

  // Pull image
  try {
    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`📥 Pulling Docker image: ${image}...`);
    }

    execSync(`docker pull ${image}`, {
      stdio: verbose ? 'inherit' : 'pipe',
    });

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`✅ Image pulled successfully: ${image}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to pull Docker image: ${image}\n` +
        `   Check internet connection or use --no-pull\n` +
        `   Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Removes a Docker container
 *
 * @param containerIdOrName - Container ID or name
 * @param force - Force removal (default: true)
 */
export function removeContainer(
  containerIdOrName: string,
  force: boolean = true,
): void {
  try {
    const forceFlag = force ? '-f' : '';
    execSync(`docker rm ${forceFlag} ${containerIdOrName}`, { stdio: 'pipe' });
  } catch {
    // Ignore errors (container might not exist)
  }
}

/**
 * Stops a Docker container
 *
 * @param containerIdOrName - Container ID or name
 * @param timeout - Timeout in seconds before force kill (default: 25)
 */
export function stopContainer(
  containerIdOrName: string,
  timeout: number = 25,
): void {
  try {
    execSync(`docker stop --time ${timeout} ${containerIdOrName}`, {
      stdio: 'pipe',
    });
  } catch {
    // Ignore errors (container might not exist or already stopped)
  }
}

/**
 * Gets container ID from container name
 *
 * @param name - Container name
 * @returns Container ID or undefined if not found
 */
export function getContainerId(name: string): string | undefined {
  try {
    const result = execSync(`docker ps -aq -f name=^${name}$`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return result.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks if a container with the given name is already running
 *
 * @param name - Container name
 * @returns True if container is running
 */
export function isContainerRunning(name: string): boolean {
  try {
    const result = execSync(
      `docker ps -q -f name=^${name}$ -f status=running`,
      {
        stdio: 'pipe',
        encoding: 'utf-8',
      },
    );
    return result.trim().length > 0;
  } catch {
    return false;
  }
}
