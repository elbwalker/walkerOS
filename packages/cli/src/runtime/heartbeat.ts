import { randomBytes } from 'crypto';
import { VERSION } from '../version.js';
import type { Collector, Logger } from '@walkeros/core';

export interface CounterPayload {
  eventsIn: number;
  eventsOut: number;
  eventsFailed: number;
  destinations: Record<
    string,
    { count: number; failed: number; duration: number }
  >;
}

export interface CounterSnapshot {
  in: number;
  out: number;
  failed: number;
  destinations: Record<
    string,
    { count: number; failed: number; duration: number }
  >;
}

export function computeCounterDelta(
  current: CounterSnapshot,
  last: CounterSnapshot,
): CounterPayload {
  const destinations: CounterPayload['destinations'] = {};
  for (const [name, dest] of Object.entries(current.destinations)) {
    const prev = last.destinations[name] || {
      count: 0,
      failed: 0,
      duration: 0,
    };
    destinations[name] = {
      count: dest.count - prev.count,
      failed: dest.failed - prev.failed,
      duration: dest.duration - prev.duration,
    };
  }
  return {
    eventsIn: current.in - last.in,
    eventsOut: current.out - last.out,
    eventsFailed: current.failed - last.failed,
    destinations,
  };
}

const instanceId = randomBytes(8).toString('hex');

export function getInstanceId(): string {
  return instanceId;
}

export interface HeartbeatConfig {
  appUrl: string;
  token: string;
  projectId: string;
  flowId?: string;
  deploymentId?: string;
  configVersion?: string;
  mode: string;
  intervalMs: number;
  getCounters?: () => Collector.Status | undefined;
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

  let lastReported: CounterSnapshot = {
    in: 0,
    out: 0,
    failed: 0,
    destinations: {},
  };

  async function sendOnce(): Promise<void> {
    try {
      // Read current counters and compute delta
      let counters: CounterPayload | undefined;
      const status = config.getCounters?.();
      if (status) {
        const current: CounterSnapshot = {
          in: status.in,
          out: status.out,
          failed: status.failed,
          destinations: { ...status.destinations },
        };
        counters = computeCounterDelta(current, lastReported);
      }

      const response = await fetch(
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
            ...(config.deploymentId && {
              deploymentId: config.deploymentId,
            }),
            configVersion,
            mode: config.mode,
            cliVersion: VERSION,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            ...(counters && { counters }),
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      // Update snapshot only on success so deltas accumulate on failure
      if (response.ok && status) {
        lastReported = {
          in: status.in,
          out: status.out,
          failed: status.failed,
          destinations: { ...status.destinations },
        };
      }

      if (response.status === 401 || response.status === 403) {
        logger.error(
          `Heartbeat auth failed (${response.status}). Token may have expired — redeploy to rotate.`,
        );
      }
    } catch (error) {
      // Deltas accumulate on failure — next successful send includes them
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Heartbeat failed: ${message}`);
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
