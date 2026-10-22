import type { Logger } from '@walkeros/core';
import type { Env, Hit, Settings } from './types';
import { sendServer } from '@walkeros/server-core';

/** One hit as a Tracking API request string, WHATWG form-encoded. */
export function toRequestString(hit: Hit): string {
  return `?${new URLSearchParams(hit).toString()}`;
}

/** The bulk body, the only POST body the Tracking API documents. */
export function toBody(hits: Hit[]): string {
  return JSON.stringify({ requests: hits.map(toRequestString) });
}

export async function sendHits(
  hits: Hit[],
  settings: Settings,
  env: Env | undefined,
  logger: Logger.Instance,
): Promise<void> {
  const url = `${settings.url}ppms.php`;
  const sendServerFn = env?.sendServer || sendServer;

  await sendServerFn(url, toBody(hits), {
    timeout: settings.timeout ?? 5000,
  });

  logger.debug('Piwik PRO request sent', { url, hits: hits.length });
}
