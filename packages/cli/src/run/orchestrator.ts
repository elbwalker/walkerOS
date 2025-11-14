/**
 * Docker Orchestrator
 *
 * Handles Docker container spawning, streaming, and lifecycle management
 */

import { spawn, type ChildProcess } from 'child_process';
import type { DockerRunConfig, RunResult } from './types';

/**
 * Builds Docker run arguments from configuration
 *
 * @param config - Docker run configuration
 * @returns Array of Docker CLI arguments
 */
export function buildDockerArgs(config: DockerRunConfig): string[] {
  const args: string[] = [];

  // Run mode
  args.push('run');

  // Remove container after exit (unless detached)
  if (!config.detach) {
    args.push('--rm');
  }

  // Detached mode
  if (config.detach) {
    args.push('-d');
  }

  // Interactive mode (for Ctrl+C handling)
  if (!config.detach) {
    args.push('-i');
  }

  // Container name
  if (config.name) {
    args.push('--name', config.name);
  }

  // Port mapping
  if (config.port) {
    args.push('-p', `${config.port}:${config.port}`);
  }

  // Mount flow file
  args.push('-v', `${config.flowFile}:/app/config/flow.json:ro`);

  // Environment variables
  args.push('-e', `MODE=${config.mode}`);
  args.push('-e', 'FLOW=/app/config/flow.json');

  if (config.port) {
    args.push('-e', `PORT=${config.port}`);
  }

  if (config.host) {
    args.push('-e', `HOST=${config.host}`);
  }

  // Image
  args.push(config.image);

  return args;
}

/**
 * Spawns a Docker container and streams output
 *
 * @param config - Docker run configuration
 * @param verbose - Enable verbose output
 * @returns Run result with exit code and container info
 */
export async function spawnContainer(
  config: DockerRunConfig,
  verbose: boolean = false,
): Promise<RunResult> {
  const startTime = Date.now();
  const args = buildDockerArgs(config);

  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(`🐳 Running: docker ${args.join(' ')}`);
  }

  return new Promise<RunResult>((resolve) => {
    let containerId: string | undefined;

    // Spawn Docker process
    const process = spawn('docker', args, {
      stdio: config.detach ? 'pipe' : ['ignore', 'inherit', 'inherit'],
    });

    // For detached mode, capture container ID
    if (config.detach && process.stdout) {
      let stdout = '';
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      process.on('exit', (code) => {
        containerId = stdout.trim();
        resolve({
          success: code === 0,
          exitCode: code || 0,
          containerId,
          duration: Date.now() - startTime,
        });
      });
      return;
    }

    // Setup signal handlers for graceful shutdown
    let isShuttingDown = false;
    let shutdownTimeout: NodeJS.Timeout | undefined;

    const gracefulShutdown = () => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      // eslint-disable-next-line no-console
      console.log('\n🛑 Shutting down gracefully...');

      // Send SIGTERM to container
      process.kill('SIGTERM');

      // Force kill after timeout
      shutdownTimeout = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log('⏰ Timeout reached, force killing container...');
        process.kill('SIGKILL');
      }, 25000);
    };

    // Handle Ctrl+C and SIGTERM
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    // Handle process exit
    process.on('exit', (code, signal) => {
      // Clear shutdown timeout
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
      }

      // Remove signal handlers
      process.removeAllListeners('SIGINT');
      process.removeAllListeners('SIGTERM');

      const exitCode = code !== null ? code : signal === 'SIGTERM' ? 143 : 1;
      const success = exitCode === 0;

      resolve({
        success,
        exitCode,
        duration: Date.now() - startTime,
        error: success ? undefined : `Container exited with code ${exitCode}`,
      });
    });

    // Handle spawn errors
    process.on('error', (error) => {
      // Clear shutdown timeout
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
      }

      resolve({
        success: false,
        exitCode: 1,
        duration: Date.now() - startTime,
        error: `Failed to spawn Docker process: ${error.message}`,
      });
    });
  });
}

/**
 * Formats a Docker run result for display
 *
 * @param result - Run result
 * @param mode - Run mode
 * @returns Formatted message
 */
export function formatResult(result: RunResult, mode: string): string {
  const durationSec = (result.duration / 1000).toFixed(2);

  if (result.containerId) {
    // Detached mode
    return (
      `✅ Container started in detached mode\n` +
      `   Container ID: ${result.containerId}\n` +
      `   Mode: ${mode}\n` +
      `   \n` +
      `   View logs: docker logs -f ${result.containerId}\n` +
      `   Stop container: docker stop ${result.containerId}`
    );
  }

  if (result.success) {
    return `✅ Container completed successfully (${durationSec}s)`;
  }

  return (
    `❌ Container failed (${durationSec}s)\n` +
    `   ${result.error || `Exit code: ${result.exitCode}`}`
  );
}
