import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { DataLayer } from '../types';

const createTrigger: Trigger.CreateFn<unknown, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<unknown, void> = () => async (content: unknown) => {
    // Lazy startFlow: the source patches window.dataLayer.push during init
    // and finds the page's window itself, as in a real integration.
    if (!flow) {
      const result = await startFlow({
        ...config,
        run: config.run ?? true,
      });
      flow = { collector: result.collector, elb: result.elb };
    }

    // Push to dataLayer — the interceptor catches it
    pushTo(window, content);
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
  const win = env.window;
  if (!isWindow(win)) return;
  pushTo(win, input);
};

function pushTo(win: Window, content: DataLayer[number]): void {
  if (!win.dataLayer) win.dataLayer = [];
  win.dataLayer.push(content);
}

function isWindow(value: unknown): value is Window {
  return (
    typeof value === 'object' && value !== null && 'addEventListener' in value
  );
}

export { createTrigger, trigger };
