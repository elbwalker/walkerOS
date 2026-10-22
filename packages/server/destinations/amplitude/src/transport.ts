import type { Payload, Response, Transport } from '@amplitude/analytics-core';
import { BaseTransport, Status } from '@amplitude/analytics-core';
import { isObject, StepError } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';

/**
 * The answers the SDK retries: a 5xx, a 408 and an unreadable answer. Under
 * an explicit flush the SDK retries only a send that throws, so these throw.
 */
const RETRIED: Status[] = [Status.Failed, Status.Timeout, Status.Unknown];

/**
 * The SDK's transport, on the global `fetch` through `sendServer`: every
 * request ends after `timeout` ms (a quarter of `config.timeout`). The SDK's
 * own Node transport has none, so a request Amplitude never answered kept
 * its flush running and every later flush was skipped. A request that times
 * out or fails on the network throws, as does an answer the SDK retries: the
 * SDK then sends the events again, an explicit flush included, up to
 * `flushMaxRetries` attempts.
 */
export class AmplitudeTransport extends BaseTransport implements Transport {
  constructor(private readonly timeout: number) {
    super();
  }

  async send(serverUrl: string, payload: Payload): Promise<Response | null> {
    let status = 200;
    let body: unknown;
    try {
      ({ data: body } = await sendServer(serverUrl, JSON.stringify(payload), {
        timeout: this.timeout,
      }));
    } catch (error) {
      // An answer other than 2xx carries its status and body; anything else
      // (a timeout, a network failure) is a send that failed.
      if (!(error instanceof StepError) || error.status === undefined)
        throw error;
      status = error.status;
      body = error.body;
    }

    const response = this.buildResponse({
      code: status,
      ...(isObject(body) ? body : {}),
    });
    if (!response || RETRIED.includes(response.status))
      throw new StepError(`Amplitude answered ${status}`, {
        code: 'transport',
        status,
      });
    return response;
  }
}
