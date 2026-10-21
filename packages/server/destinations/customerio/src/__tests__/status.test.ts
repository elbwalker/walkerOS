import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationCustomerIo } from '..';
import { examples } from '../dev';
import type { Env } from '../types';

describe('customerio failure status', () => {
  async function failWith(statusCode: number | undefined) {
    const error = Object.assign(
      new Error('request failed'),
      statusCode === undefined ? {} : { statusCode },
    );
    const { trackClient } = examples.env.push;
    if (!trackClient) throw new Error('mock env lacks trackClient');
    const env: Env = {
      trackClient: { ...trackClient, track: () => Promise.reject(error) },
    };
    const { collector } = await startFlow({
      destinations: {
        dest: {
          code: { ...destinationCustomerIo, env },
          config: { settings: { siteId: 'site', apiKey: 'key' } },
        },
      },
    });
    const result = await collector.push(
      getEvent('page view', { user: { id: 'u1' } }),
    );
    return result.failed?.dest?.reason;
  }

  it('does not retry a 400', async () => {
    expect(await failWith(400)).toMatchObject({
      code: 'transport',
      status: 400,
      retryable: false,
    });
  });

  it('retries a 503', async () => {
    expect(await failWith(503)).toMatchObject({
      status: 503,
      retryable: true,
    });
  });
});
