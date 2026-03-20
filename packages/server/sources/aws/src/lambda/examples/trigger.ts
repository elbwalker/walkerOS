import type { Trigger, Collector } from '@walkeros/core';
import type { LambdaEvent, LambdaContext, LambdaResult } from '../types';
import { startFlow } from '@walkeros/collector';

export interface Content {
  [key: string]: unknown;
}

export interface Result {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Find the lambda source instance from the collector's registered sources.
 */
function findLambdaSource(collector: Collector.Instance) {
  for (const source of Object.values(collector.sources || {})) {
    if ((source as { type?: string }).type === 'lambda') return source;
  }
}

/**
 * Lambda source createTrigger.
 *
 * Boots the collector via startFlow, then invokes the Lambda source's push()
 * with a real API Gateway event and a minimal Lambda context.
 *
 * Content is the raw Lambda event object (API Gateway v1 or v2 format).
 * Result contains statusCode, parsed body, and headers.
 *
 * @example
 * const { trigger, flow } = await createTrigger(config);
 * const result = await trigger('POST')({ version: '2.0', ... });
 * console.log(result.statusCode, result.body);
 */
const createTrigger: Trigger.CreateFn<Content, Result> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<Content, Result> =
    () =>
    async (content: Content): Promise<Result> => {
      // Lazy startFlow
      if (!flow) {
        const result = await startFlow(config);
        flow = { collector: result.collector, elb: result.elb };
      }

      const source = findLambdaSource(flow.collector);
      if (!source) throw new Error('Lambda source not found in collector');

      // Create minimal Lambda context
      const lambdaContext = {
        awsRequestId: `test-${Date.now()}`,
      } as unknown as LambdaContext;

      // Call source.push with the raw Lambda event + context
      const pushFn = (
        source as unknown as {
          push: (...args: unknown[]) => Promise<LambdaResult>;
        }
      ).push;
      const lambdaResult = await pushFn(
        content as unknown as LambdaEvent,
        lambdaContext,
      );

      // Parse response
      let body: unknown;
      try {
        body = JSON.parse(lambdaResult.body || '{}');
      } catch {
        body = lambdaResult.body;
      }

      const headers: Record<string, string> = {};
      if (lambdaResult.headers) {
        for (const [k, v] of Object.entries(lambdaResult.headers)) {
          if (v !== undefined) headers[k] = String(v);
        }
      }

      return {
        statusCode: lambdaResult.statusCode,
        body,
        headers,
      };
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/**
 * Legacy trigger — takes a source instance directly.
 * Preserved for CLI simulate path.
 */
function trigger(source: {
  push: (event: LambdaEvent, context: LambdaContext) => Promise<LambdaResult>;
}): (content: Content) => Promise<LambdaResult> {
  return async (content: Content) => {
    const lambdaEvent = { ...(content as Record<string, unknown>) };

    // Adapt body format: step examples may use `name`, source expects `event`
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

export { createTrigger, trigger };
