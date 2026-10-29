import type { Trigger } from '@walkeros/core';
import { isObject, Source } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { Types } from '../types';

/** What the trigger sends: one HTTP request. */
export interface Content {
  method: string;
  url: string;
  body?: unknown;
}

/** Whether a trigger's content is a request (simulate passes any JSON). */
export const isContent = (value: unknown): value is Content =>
  isObject(value) &&
  typeof value.method === 'string' &&
  typeof value.url === 'string';

/** What the producer receives: the status and the JSON body. */
export interface Result {
  status: number;
  body: unknown;
}

/**
 * Starts the flow on the first call, then calls the source's push with a real
 * `Request` built from `content`. The source under test is the config's first
 * source.
 */
export const createTrigger: Trigger.CreateFn<unknown, Result> = async (
  config,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<unknown, Result> = () => async (content) => {
    if (!isContent(content))
      throw new Error(
        'createTrigger: content is not a request { method, url }',
      );
    if (!flow) {
      const result = await startFlow(config);
      flow = { collector: result.collector, elb: result.elb };
    }

    const [id] = Object.keys(config.sources ?? {});
    if (!id) throw new Error('createTrigger: the config has no source');
    const source = Source.getSource<Types>(flow.collector, id);

    const response = await source.push(
      new Request(content.url, {
        method: content.method,
        headers: { 'content-type': 'application/json' },
        body:
          content.body === undefined ? undefined : JSON.stringify(content.body),
      }),
    );
    return { status: response.status, body: await response.json() };
  };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};
