import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { OneTrustAPI } from '../types';

const oneTrust: OneTrustAPI = { IsAlertBoxClosed: () => true };

const createTrigger: Trigger.CreateFn<string, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<string, void> = () => async (content: string) => {
    // Pre-init: set OneTrust globals (source reads these during init)
    window.OptanonActiveGroups = content;
    window.OneTrust = oneTrust;

    // Lazy startFlow — source checks globals immediately during init
    if (!flow) {
      const result = await startFlow({ ...config, run: config.run ?? true });
      flow = { collector: result.collector, elb: result.elb };
    }
  };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/** Sets OptanonActiveGroups and OneTrust globals before source init. */
const trigger = (input: unknown, env: Record<string, unknown>): void => {
  const win = env.window;
  if (typeof input !== 'string' || !isWindow(win)) return;
  win.OptanonActiveGroups = input;
  win.OneTrust = oneTrust;
};

function isWindow(value: unknown): value is Window {
  return (
    typeof value === 'object' && value !== null && 'addEventListener' in value
  );
}

export { createTrigger, trigger };
