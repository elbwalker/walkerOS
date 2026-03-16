import type { Trigger } from '@walkeros/core';
import { examples } from '../dev';
import { sourceExpress } from '../index';

describe('Express createTrigger', () => {
  let instance: Trigger.Instance<unknown, unknown>;

  afterEach(async () => {
    // Destroy server if flow was initialized
    if (instance?.flow) {
      await instance.flow.collector.command('shutdown');
    }
  });

  it('should be typed as Trigger.CreateFn', () => {
    const fn: Trigger.CreateFn = examples.createTrigger;
    expect(typeof fn).toBe('function');
  });

  it('should return trigger function and undefined flow before first call', async () => {
    instance = await examples.createTrigger({
      sources: {
        express: {
          code: sourceExpress,
          config: { settings: { port: 0 } },
        },
      },
    });
    expect(instance.flow).toBeUndefined();
    expect(typeof instance.trigger).toBe('function');
  });

  it('should initialize flow on first trigger call', async () => {
    instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          config: { settings: { port: 0 } },
        },
      },
    });

    expect(instance.flow).toBeUndefined();
    await instance.trigger()({
      method: 'POST',
      path: '/collect',
      body: { name: 'test event' },
    });
    expect(instance.flow).toBeDefined();
    expect(instance.flow!.collector).toBeDefined();
    expect(instance.flow!.elb).toBeDefined();
  });

  it('should return HTTP response with status, body, and headers', async () => {
    instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          config: { settings: { port: 0 } },
        },
      },
    });

    const result = await instance.trigger()({
      method: 'POST',
      path: '/collect',
      body: { name: 'page view' },
    });

    expect(result).toBeDefined();
    expect(typeof result.status).toBe('number');
    expect(result.status).toBe(200);
    expect(result.body).toBeDefined();
    expect(result.headers).toBeDefined();
  });

  it('should handle GET requests (pixel tracking)', async () => {
    instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          config: { settings: { port: 0 } },
        },
      },
    });

    const result = await instance.trigger()({
      method: 'GET',
      path: '/collect',
      query: { e: 'page view', d: '{"title":"Home"}' },
    });

    expect(result.status).toBe(200);
  });

  it('should return 400 for invalid POST body', async () => {
    instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        express: {
          code: sourceExpress,
          config: { settings: { port: 0 } },
        },
      },
    });

    const result = await instance.trigger()({
      method: 'POST',
      path: '/collect',
      body: 'not-an-object' as unknown,
    });

    expect(result.status).toBe(400);
  });
});
