import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

interface UsercentricsContent {
  event: string;
  type: string;
  action?: string;
  ucCategory?: Record<string, boolean | unknown>;
  [service: string]: unknown;
}

const createTrigger: Trigger.CreateFn<UsercentricsContent, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<UsercentricsContent, void> =
    (type?: string, opts?: unknown) => async (content: UsercentricsContent) => {
      // Lazy startFlow — source registers ucEvent listener during init
      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
      }

      // Dispatch the CMP event — source's listener catches it
      const eventName =
        (opts as { eventName?: string })?.eventName || 'ucEvent';
      window.dispatchEvent(new CustomEvent(eventName, { detail: content }));
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/** Dispatches ucEvent CustomEvent after source init (post-init trigger). */
const trigger = (
  input: unknown,
  env: Record<string, unknown>,
): void | (() => void) => {
  if (!input || typeof input !== 'object') return;
  return () => {
    (env.window as Window).dispatchEvent(
      new CustomEvent('ucEvent', { detail: input }),
    );
  };
};

export { createTrigger, trigger };
