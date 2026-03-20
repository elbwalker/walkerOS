import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

const createTrigger: Trigger.CreateFn<string, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<string, void> = () => async (content: string) => {
    // Pre-init: set OneTrust globals (source reads these during init)
    const win = window as unknown as Record<string, unknown>;
    win.OptanonActiveGroups = content;
    win.OneTrust = { IsAlertBoxClosed: () => true };

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
  const win = env.window as Window & Record<string, unknown>;
  if (typeof input !== 'string') return;
  win.OptanonActiveGroups = input;
  win.OneTrust = { IsAlertBoxClosed: () => true };
};

export { createTrigger, trigger };
