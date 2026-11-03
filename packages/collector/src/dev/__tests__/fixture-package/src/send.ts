import { networkErrorMessage, StepError } from '@walkeros/core';

/** A request whose network failure is thrown as a `StepError`, as `sendServer` does. */
export async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    throw new StepError(networkErrorMessage(err), {
      code: 'transport',
      cause: err,
    });
  }
}
