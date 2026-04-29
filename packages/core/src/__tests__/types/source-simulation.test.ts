import type { Collector, Source, Trigger } from '../../index';
import { createMockElb } from '../helpers/mocks';

describe('Trigger types', () => {
  it('Fn type is curried and async', () => {
    const trigger: Trigger.Fn<string, void> = (_type?, _options?) => {
      return async (_content: string) => {};
    };
    expect(typeof trigger).toBe('function');
    expect(typeof trigger('click', 'button')).toBe('function');
  });

  it('Instance has lazy flow (undefined until first trigger call) and trigger', () => {
    let flow: Trigger.FlowHandle | undefined;

    const instance: Trigger.Instance<string, void> = {
      get flow() {
        return flow;
      },
      trigger: (_type?, _options?) => async (_content: string) => {
        if (!flow) {
          flow = {
            collector: {} as Collector.Instance,
            elb: createMockElb(),
          };
        }
      },
    };

    // Before first trigger call, flow is undefined
    expect(instance.flow).toBeUndefined();
    expect(typeof instance.trigger).toBe('function');
  });

  it('CreateFn returns Promise<Instance> with lazy flow', async () => {
    const createTrigger: Trigger.CreateFn<string, void> = async (_config) => {
      let flow: Trigger.FlowHandle | undefined;

      return {
        get flow() {
          return flow;
        },
        trigger: (_type?, _options?) => async (_content: string) => {
          if (!flow) {
            flow = {
              collector: {} as Collector.Instance,
              elb: createMockElb(),
            };
          }
        },
      };
    };

    const instance = await createTrigger({});
    // Flow is undefined before first trigger call
    expect(instance.flow).toBeUndefined();
    // After triggering, flow is initialized
    await instance.trigger()('test');
    expect(instance.flow).toBeDefined();
    expect(typeof instance.trigger).toBe('function');
  });

  it('Renderer accepts both values', () => {
    const renderers: Source.Renderer[] = ['browser', 'codebox'];
    expect(renderers).toHaveLength(2);
  });
});
