import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationKlaviyo } from '..';
import type { Env } from '../types';

describe('klaviyo failure status', () => {
  async function failWith(status: number | undefined) {
    const error = Object.assign(
      new Error('request failed'),
      status === undefined ? {} : { response: { status } },
    );
    const env: Env = {
      eventsApi: { createEvent: () => Promise.reject(error) },
      profilesApi: { createOrUpdateProfile: () => Promise.resolve({}) },
    };
    const { collector } = await startFlow({
      destinations: {
        dest: {
          code: { ...destinationKlaviyo, env },
          config: { settings: { apiKey: 'pk_test_key' } },
        },
      },
    });
    const result = await collector.push(
      getEvent('page view', { user: { id: 'u1', email: 'a@b.co' } }),
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

  it('retries a network error without a status', async () => {
    expect(await failWith(undefined)).toMatchObject({ retryable: true });
  });
});
