import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { UsercentricsV2Api, UsercentricsV2Service } from '../types';

/**
 * `content` is what `window.UC_UI.getServicesBaseInfo()` returns. The
 * `dispatch` option picks the official path the source reacts to:
 *   - 'init' (default): UC_UI is attached before the source runs, so the
 *     static read at init publishes the snapshot.
 *   - 'cmp': UC_UI is attached after init, then a `UC_UI_CMP_EVENT`
 *     ACCEPT_ALL decision makes the source re-read and publish.
 */
const createTrigger: Trigger.CreateFn<UsercentricsV2Service[], void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<UsercentricsV2Service[], void> =
    (_type?: string, opts?: unknown) =>
    async (content: UsercentricsV2Service[]) => {
      const dispatch =
        opts &&
        typeof opts === 'object' &&
        'dispatch' in opts &&
        opts.dispatch === 'cmp'
          ? 'cmp'
          : 'init';
      const ucUi: UsercentricsV2Api = {
        isInitialized: () => true,
        getServicesBaseInfo: () => content,
      };

      if (dispatch === 'init') window.UC_UI = ucUi;

      // Lazy startFlow: the source attaches its listeners and does the
      // static read during init.
      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
      }

      if (dispatch === 'cmp') {
        window.UC_UI = ucUi;
        window.dispatchEvent(
          new CustomEvent('UC_UI_CMP_EVENT', {
            detail: { source: 'button', type: 'ACCEPT_ALL' },
          }),
        );
      }
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/** Attaches the services as the V2 `UC_UI` API before source init. */
const trigger = (input: unknown, env: Record<string, unknown>): void => {
  const win = env.window;
  if (!Array.isArray(input) || !isWindow(win)) return;
  win.UC_UI = {
    isInitialized: () => true,
    getServicesBaseInfo: () => input,
  };
};

function isWindow(value: unknown): value is Window {
  return (
    typeof value === 'object' && value !== null && 'addEventListener' in value
  );
}

export { createTrigger, trigger };
