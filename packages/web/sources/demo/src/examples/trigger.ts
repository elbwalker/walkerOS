import type { Trigger, Collector, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

/**
 * Demo source createTrigger.
 *
 * DOM-free. The demo source's `push` is `elb`, so the trigger pushes the
 * supplied content (a walkerOS event `{ name, data }`) straight through `elb`
 * into the collector. On the first trigger call the flow is lazily started.
 *
 * Determinism note: `startFlow` initializes the demo source, which eagerly
 * fires every `settings.events` entry the source declares (via setTimeout).
 * Config is passed through UNMODIFIED (pass-through doctrine), so the events a
 * caller observes are the supplied content PLUS any `settings.events` the
 * flow's demo source declares. For deterministic single-event simulation the
 * flow's demo source must declare no `settings.events`.
 *
 * @example
 * const { trigger } = await createTrigger(config);
 * await trigger()({ name: 'page view', data: { title: 'Home' } });
 */
const createTrigger: Trigger.CreateFn<WalkerOS.DeepPartialEvent, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<WalkerOS.DeepPartialEvent, void> =
    () => async (content: WalkerOS.DeepPartialEvent) => {
      // Lazy startFlow — first call initializes the flow and the demo source.
      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
      }

      // The demo source pushes via elb; mirror that by pushing the supplied
      // content straight through. Only the supplied content is pushed here.
      await flow.elb(content);
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

export { createTrigger };
