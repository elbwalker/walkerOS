import { sourcePubSubPush } from '../index';
import * as examples from '../examples';
import { createMockContext } from '@walkeros/core';
import type { Source } from '@walkeros/core';
import type { Env, Request, Response, Types } from '../types';
import { createTrigger } from '../examples/trigger';
import { push as pushEnv } from '../examples/env';

interface ResponseRecord {
  statusCode?: number;
  body?: unknown;
}

function buildContext(
  partialSettings: Partial<Types['settings']> = {},
  envOverride?: Env,
): Source.Context<Types> {
  const base = createMockContext<Types>({
    config: { settings: { ...partialSettings } },
    env: envOverride ?? pushEnv,
  });
  return {
    ...base,
    id: 'pubsub',
    setIngest: async () => undefined,
    setRespond: () => undefined,
  };
}

function buildResponse(state: ResponseRecord): Response {
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
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return {
    method: 'POST',
    body,
    headers,
    get(name: string) {
      return headers[name.toLowerCase()] ?? headers[name];
    },
  };
}

describe('Pub/Sub push source', () => {
  it('returns 405 for non-POST requests', async () => {
    const ctx = buildContext();
    const instance = await sourcePubSubPush(ctx);
    const state: ResponseRecord = {};
    const req: Request = {
      method: 'GET',
      body: undefined,
      headers: {},
      get: () => undefined,
    };
    await instance.push(req, buildResponse(state));
    expect(state.statusCode).toBe(405);
  });

  it('returns 400 for malformed envelope', async () => {
    const ctx = buildContext();
    const instance = await sourcePubSubPush(ctx);
    const state: ResponseRecord = {};
    await instance.push(
      buildRequest({ not_an: 'envelope' }),
      buildResponse(state),
    );
    expect(state.statusCode).toBe(400);
  });

  it('returns 400 for malformed JSON body string', async () => {
    const ctx = buildContext();
    const instance = await sourcePubSubPush(ctx);
    const state: ResponseRecord = {};
    await instance.push(buildRequest('not-json{'), buildResponse(state));
    expect(state.statusCode).toBe(400);
  });

  it('decodes valid envelope and forwards to collector', async () => {
    const ctx = buildContext();
    const instance = await sourcePubSubPush(ctx);
    const state: ResponseRecord = {};
    const data = Buffer.from(
      JSON.stringify({ name: 'page view', data: { title: 'Home' } }),
      'utf8',
    ).toString('base64');
    await instance.push(
      buildRequest({
        message: { messageId: 'msg-1', data, attributes: {} },
        subscription: 'projects/test/subscriptions/sub',
      }),
      buildResponse(state),
    );
    expect(state.statusCode).toBe(200);
  });

  it('returns 400 on JSON decoder error', async () => {
    const ctx = buildContext({ decoder: 'json' });
    const instance = await sourcePubSubPush(ctx);
    const state: ResponseRecord = {};
    const data = Buffer.from('not-json{', 'utf8').toString('base64');
    await instance.push(
      buildRequest({
        message: { messageId: 'msg-2', data, attributes: {} },
        subscription: 'projects/test/subscriptions/sub',
      }),
      buildResponse(state),
    );
    expect(state.statusCode).toBe(400);
  });

  it('verifyOidc=true with no token returns 401', async () => {
    const ctx = buildContext({
      verifyOidc: true,
      audience: 'https://test.example/push',
    });
    const instance = await sourcePubSubPush(ctx);
    const state: ResponseRecord = {};
    const data = Buffer.from(
      JSON.stringify({ name: 'page view' }),
      'utf8',
    ).toString('base64');
    await instance.push(
      buildRequest({
        message: { messageId: 'msg-3', data },
        subscription: 'sub',
      }),
      buildResponse(state),
    );
    expect(state.statusCode).toBe(401);
  });

  it('verifyOidc=true with valid token (env stub) returns 200', async () => {
    const env: Env = {
      ...pushEnv,
      verifyOidcToken: async () => ({ sub: 'test-sub' }),
    };
    const ctx = buildContext(
      { verifyOidc: true, audience: 'https://test.example/push' },
      env,
    );
    const instance = await sourcePubSubPush(ctx);
    const state: ResponseRecord = {};
    const data = Buffer.from(
      JSON.stringify({ name: 'page view' }),
      'utf8',
    ).toString('base64');
    await instance.push(
      buildRequest(
        {
          message: { messageId: 'msg-4', data },
          subscription: 'sub',
        },
        { authorization: 'Bearer fake.token.here' },
      ),
      buildResponse(state),
    );
    expect(state.statusCode).toBe(200);
  });

  it('verifyOidc=true without audience throws on init', async () => {
    const ctx = buildContext({ verifyOidc: true });
    await expect(sourcePubSubPush(ctx)).rejects.toThrow('audience');
  });

  describe('step examples via createTrigger', () => {
    interface StepShape {
      in: Record<string, unknown>;
      out: Array<[string, ...unknown[]]>;
    }
    function isStepShape(v: unknown): v is StepShape {
      if (typeof v !== 'object' || v === null) return false;
      const c: { in?: unknown; out?: unknown } = v;
      return Boolean(c.in) && Array.isArray(c.out);
    }

    it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
      if (!isStepShape(rawExample)) {
        throw new Error('example missing in/out shape');
      }
      const example = rawExample;
      const { trigger } = await createTrigger({
        sources: {
          pubsub: {
            code: sourcePubSubPush,
            config: { settings: {} },
            env: pushEnv,
          },
        },
      });
      const result = await trigger()(example.in);
      expect(result).toEqual(example.out);
    });
  });
});
