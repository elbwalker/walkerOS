import type { Trigger } from '@walkeros/core';
import type { LambdaSource, LambdaEvent, LambdaContext } from '../types';

/**
 * Lambda source trigger.
 * Passes step example `in` data as a Lambda event to source.push().
 *
 * The step example `in` IS the raw Lambda event (v1 or v2 format).
 * Adapts body format: step examples use `name`, source expects `event`.
 */
export function createTrigger(
  source: LambdaSource,
): Trigger.Fn<unknown, Promise<unknown>> {
  return async (content) => {
    const lambdaEvent = { ...(content as Record<string, unknown>) };

    if (lambdaEvent.body && typeof lambdaEvent.body === 'string') {
      const body = JSON.parse(lambdaEvent.body);
      if (body.name && !body.event) {
        lambdaEvent.body = JSON.stringify({
          ...body,
          event: body.name,
          name: undefined,
        });
      }
    }

    const context: LambdaContext = {
      awsRequestId: 'test-req',
    } as unknown as LambdaContext;

    return source.push(lambdaEvent as unknown as LambdaEvent, context);
  };
}
