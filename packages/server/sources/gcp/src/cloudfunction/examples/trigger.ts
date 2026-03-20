import type { Trigger, Collector } from '@walkeros/core';
import type { CloudFunctionSource, Request, Response } from '../types';
import { startFlow } from '@walkeros/collector';

export interface Content {
  method: string;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface Result {
  status: number;
  body: unknown;
}

/**
 * Find the cloudfunction source instance from collector.sources.
 */
function findGcpSource(
  collector: Collector.Instance,
): CloudFunctionSource | undefined {
  for (const source of Object.values(collector.sources || {})) {
    if ((source as { type?: string }).type === 'cloudfunction')
      return source as unknown as CloudFunctionSource;
  }
  return undefined;
}

/**
 * GCP CloudFunction source createTrigger.
 *
 * Boots a real collector via startFlow, then synthesizes mock req/res
 * (matching the GCP Functions Framework pattern) and calls source.push(req, res).
 * This is the realistic approach for GCP Cloud Functions - the Functions Framework
 * synthesizes these objects in production too.
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

      const source = findGcpSource(flow.collector);
      if (!source)
        throw new Error(
          'CloudFunction source not found in collector — ensure it is configured in sources',
        );

      // Adapt body: step examples use `name`, source expects `event`
      const body = { ...content.body };
      if (body.name && !body.event) {
        body.event = body.name;
        delete body.name;
      }

      const headers = content.headers || {
        'content-type': 'application/json',
      };

      // Synthesize mock req matching GCP Functions Framework pattern
      const req = {
        method: content.method,
        body,
        headers,
        get: (h: string) => headers[h.toLowerCase()],
      } as Request;

      // Synthesize mock res that captures status and response body
      let statusCode = 200;
      let responseBody: unknown;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: unknown) => {
          responseBody = data;
          return res;
        },
        send: (data: unknown) => {
          responseBody = data;
          return res;
        },
        set: () => res,
      } as unknown as Response;

      // GCP source awaits env.push() — no detached promises
      await source.push(req, res);

      return { status: statusCode, body: responseBody };
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

export { createTrigger };
