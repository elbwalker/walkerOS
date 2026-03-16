import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

export interface Content {
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface Result {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

function findFetchSource(collector: Collector.Instance) {
  for (const source of Object.values(collector.sources || {})) {
    if ((source as { type?: string }).type === 'fetch') return source;
  }
}

const createTrigger: Trigger.CreateFn<Content, Result> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<Content, Result> =
    () =>
    async (content: Content): Promise<Result> => {
      if (!flow) {
        const result = await startFlow(config);
        flow = { collector: result.collector, elb: result.elb };
      }

      const source = findFetchSource(flow.collector);
      if (!source) throw new Error('Fetch source not found in collector');

      // Construct real Request from content
      const init: RequestInit = {
        method: content.method,
        headers: { 'Content-Type': 'application/json', ...content.headers },
      };
      if (content.method !== 'GET' && content.body !== undefined) {
        init.body = JSON.stringify(content.body);
      }
      const request = new Request(content.url, init);

      // Call source.push with the real Request
      const response = await (
        source as unknown as { push: (r: Request) => Promise<Response> }
      ).push(request);

      // Convert Response to serializable result
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });

      const ct = response.headers.get('content-type') || '';
      const body = ct.includes('json')
        ? await response.json()
        : await response.text();

      return { status: response.status, body, headers: responseHeaders };
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

export { createTrigger };
