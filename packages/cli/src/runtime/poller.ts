import { fetchConfig, type FetchConfigOptions } from './config-fetcher.js';
import type { Logger } from '@walkeros/core';

export interface PollerConfig {
  fetchOptions: Omit<FetchConfigOptions, 'lastEtag'>;
  intervalMs: number;
  onUpdate: (
    content: Record<string, unknown>,
    version: string,
  ) => Promise<void>;
}

export interface PollerHandle {
  start(): void;
  stop(): void;
  pollOnce(): Promise<void>;
}

export function createPoller(
  config: PollerConfig,
  logger: Logger.Instance,
): PollerHandle {
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastEtag: string | undefined;

  async function pollOnce(): Promise<void> {
    try {
      const result = await fetchConfig({
        ...config.fetchOptions,
        lastEtag,
      });

      if (!result.changed) {
        logger.debug('Config unchanged');
        return;
      }

      logger.info(`New config version: ${result.version}`);
      lastEtag = result.etag;

      await config.onUpdate(result.content, result.version);
      logger.info('Config updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Poll error: ${message}`);
    }
  }

  function start(): void {
    lastEtag = undefined;
    const jitter = config.intervalMs * 0.15 * (Math.random() * 2 - 1);
    timer = setInterval(() => pollOnce(), config.intervalMs + jitter);
    logger.info(
      `Polling every ${Math.round((config.intervalMs + jitter) / 1000)}s`,
    );
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { start, stop, pollOnce };
}
