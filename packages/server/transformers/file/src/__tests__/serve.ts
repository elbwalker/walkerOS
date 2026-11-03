import type {
  Elb,
  Logger,
  RespondOptions,
  Store,
  WalkerOS,
} from '@walkeros/core';
import { createRespond, Level, Source } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { transformerFile } from '../transformer';
import type { FileSettings } from '../types';

/** An in-memory store, as a store with `file: true` hands back bytes. */
export function createMockStore(): Store.Instance {
  const data = new Map<string, Store.StoreValue>();
  return {
    type: 'mock',
    config: {},
    get(key) {
      return data.get(key);
    },
    set(key, value) {
      data.set(key, value);
    },
    delete(key) {
      data.delete(key);
    },
  };
}

/** A store whose every read fails, as a bucket that cannot be reached. */
export function createFailingStore(error: Error): Store.Instance {
  return {
    type: 'failing',
    config: {},
    get() {
      throw error;
    },
    set() {},
    delete() {},
  };
}

interface Request {
  path: string;
  event: WalkerOS.DeepPartialEvent;
}

interface Answered {
  result: Elb.PushResult;
  answers: RespondOptions[];
}

type HttpTypes = Source.Types<
  unknown,
  unknown,
  (request: Request) => Promise<Answered>
>;

/**
 * A server source in the shape of the express source: one scope per request,
 * a first-call-wins respond, and the 200 pixel as its fallback after the push.
 */
const httpSource: Source.Init<HttpTypes> = (context) => ({
  type: 'http',
  config: context.config,
  push: async ({ path, event }) => {
    const answers: RespondOptions[] = [];
    const respond = createRespond((options) => {
      answers.push(options);
    });
    const result = await context.withScope(
      {
        method: 'GET',
        url: `https://collect.example.com${path}`,
        path,
        query: {},
        headers: {},
        body: undefined,
        raw: {},
      },
      respond,
      (env) => env.push(event),
    );
    respond({ status: 200, body: 'pixel' });
    return { result, answers };
  },
});

interface Served {
  /** What the client receives for a request to `path`, and the push result. */
  request: (
    path: string,
    event?: WalkerOS.DeepPartialEvent,
  ) => Promise<Answered>;
  /** The context of every log line written at ERROR. */
  errors: () => Logger.LogContext[];
}

/**
 * A real collector with the file step in the source chain, as a flow routes
 * requests to it.
 */
export async function serve(
  settings: Partial<FileSettings>,
  store: Store.Instance,
): Promise<Served> {
  const lines: { level: Logger.Level; context: Logger.LogContext }[] = [];
  const { collector } = await startFlow({
    logger: {
      level: 'WARN',
      handler: (level, _message, context) => {
        lines.push({ level, context });
      },
    },
    sources: {
      http: {
        code: httpSource,
        config: { ingest: { map: { path: { key: 'path' } } } },
        next: 'file',
      },
    },
    transformers: {
      file: { code: transformerFile, config: { settings }, env: { store } },
    },
  });

  return {
    request: (path, event = { name: 'page view' }) =>
      Source.getSource<HttpTypes>(collector, 'http').push({ path, event }),
    errors: () =>
      lines
        .filter((line) => line.level === Level.ERROR)
        .map((line) => line.context),
  };
}
