import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

const createTrigger: Trigger.CreateFn<unknown, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<unknown, void> = () => async (content: unknown) => {
    // Lazy startFlow — source patches window.dataLayer.push during init
    if (!flow) {
      // Ensure dataLayer sources get the window env for interception
      const enrichedConfig = { ...config };
      if (enrichedConfig.sources) {
        enrichedConfig.sources = { ...enrichedConfig.sources };
        for (const [id, source] of Object.entries(enrichedConfig.sources)) {
          if (!source.env?.window) {
            enrichedConfig.sources[id] = {
              ...source,
              env: { ...source.env, window },
            };
          }
        }
      }
      const result = await startFlow({
        ...enrichedConfig,
        run: enrichedConfig.run ?? true,
      });
      flow = { collector: result.collector, elb: result.elb };
    }

    // Push to dataLayer — the interceptor catches it
    const win = window as Window & { dataLayer?: unknown[] };
    if (!win.dataLayer) win.dataLayer = [];
    win.dataLayer.push(content);
  };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/** Pushes step example input to window.dataLayer after source init. */
const trigger = (input: unknown, env: Record<string, unknown>): void => {
  const win = env.window as Window & { dataLayer?: unknown[] };
  if (!win.dataLayer) win.dataLayer = [];
  win.dataLayer.push(input);
};

export { createTrigger, trigger };
