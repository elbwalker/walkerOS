import type { Collector, Trigger } from '@walkeros/core';
import type { Request, Response } from '../types';
import { startFlow } from '@walkeros/collector';

/** Content for the push trigger: a Pub/Sub envelope or any POST body. */
export type Content = Record<string, unknown>;

/** Result: the recorded HTTP response (`status` + `json` body). */
export type Result = Array<[string, ...unknown[]]>;

interface RecordedResponse {
  statusCode?: number;
  body?: unknown;
}

function buildResponse(state: RecordedResponse): Response {
  const res: Response = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(body: unknown) {
      state.body = body;
      return res;
    },
    send(body?: unknown) {
      state.body = body;
      return res;
    },
    set() {
      return res;
    },
  };
  return res;
}

function buildRequest(
  content: Content,
  headers: Record<string, string>,
): Request {
  return {
    method: 'POST',
    body: content,
    headers,
    get(name: string) {
      const value = headers[name.toLowerCase()] ?? headers[name];
      return value;
    },
  };
}

interface TriggerOptions {
  headers?: Record<string, string>;
}

interface PushCapableSource {
  type: string;
  push: (req: Request, res: Response) => Promise<void>;
}

function isPushCapableSource(value: unknown): value is PushCapableSource {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { type?: unknown; push?: unknown } = value;
  return (
    typeof candidate.type === 'string' &&
    candidate.type === 'pubsub-push' &&
    typeof candidate.push === 'function'
  );
}

function findPushSource(
  collector: Collector.Instance,
): PushCapableSource | undefined {
  for (const source of Object.values(collector.sources ?? {})) {
    if (isPushCapableSource(source)) return source;
  }
  return undefined;
}

/**
 * Pub/Sub push source createTrigger.
 *
 * Boots the collector via startFlow, builds a fake Request/Response pair
 * from the trigger Content, and invokes the source's HTTP handler. Returns
 * the recorded response as a Result entry.
 */
export const createTrigger: Trigger.CreateFn<Content, Result> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<Content, Result> =
    (_type, options) =>
    async (content: Content): Promise<Result> => {
      if (!flow) {
        const result = await startFlow(config);
        flow = { collector: result.collector, elb: result.elb };
      }

      const triggerOptions: TriggerOptions =
        typeof options === 'object' && options !== null
          ? (options as TriggerOptions)
          : {};
      const headers = triggerOptions.headers ?? {};

      const source = findPushSource(flow.collector);
      if (!source) throw new Error('pubsub-push source not registered');

      const state: RecordedResponse = {};
      const req = buildRequest(content, headers);
      const res = buildResponse(state);

      await source.push(req, res);

      const recorded: Result = [
        ['response', state.statusCode ?? 0, state.body ?? null],
      ];
      return recorded;
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};
