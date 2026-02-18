import { randomBytes } from 'crypto';
import { VERSION } from '../version.js';
import type { Logger } from '@walkeros/core';

const instanceId = randomBytes(8).toString('hex');

export function getInstanceId(): string {
  return instanceId;
}

export interface HeartbeatConfig {
  appUrl: string;
  token: string;
  projectId: string;
  flowId?: string;
  configVersion?: string;
  mode: string;
  intervalMs: number;
}

export interface HeartbeatHandle {
  start(): void;
  stop(): void;
  sendOnce(): Promise<void>;
  updateConfigVersion(version: string): void;
}

export function createHeartbeat(
  config: HeartbeatConfig,
  logger: Logger.Instance,
): HeartbeatHandle {
  let timer: ReturnType<typeof setInterval> | null = null;
  const startTime = Date.now();
  let configVersion = config.configVersion;

  async function sendOnce(): Promise<void> {
    try {
      await fetch(
        `${config.appUrl}/api/projects/${config.projectId}/runners/heartbeat`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceId,
            flowId: config.flowId,
            configVersion,
            mode: config.mode,
            cliVersion: VERSION,
            uptime: Math.floor((Date.now() - startTime) / 1000),
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(`Heartbeat failed: ${message}`);
    }
  }

  function start(): void {
    sendOnce();
    const jitter = config.intervalMs * 0.1 * (Math.random() * 2 - 1);
    timer = setInterval(() => sendOnce(), config.intervalMs + jitter);
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function updateConfigVersion(version: string): void {
    configVersion = version;
  }

  return { start, stop, sendOnce, updateConfigVersion };
}
