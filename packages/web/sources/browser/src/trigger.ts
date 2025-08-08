import type { WalkerOS, Collector } from '@walkeros/core';
import type { Walker } from '@walkeros/web-core';
import type { Scope, Settings } from './types';
import { throttle, tryCatch } from '@walkeros/core';
import { Const, onApply } from '@walkeros/collector';
import { elb as elbOrg, getAttribute } from '@walkeros/web-core';
import {
  getElbAttributeName,
  getEvents,
  getPageViewData,
  getTriggerActions,
} from './walker';
import {
  initVisibilityTracking,
  triggerVisible,
  destroyVisibilityTracking,
} from './triggerVisible';
import { translateToCoreCollector } from './translation';

let scrollElements: Walker.ScrollElements = [];
let scrollListener: EventListenerOrEventListenerObject | undefined;

// Reset function for testing
export function resetScrollListener() {
  scrollListener = undefined;
  scrollElements = [];
}

export const createElb: (customLayer?: unknown) => unknown = (customLayer?) => {
  return (
    customLayer
      ? function () {
          (customLayer as unknown[]).push(arguments);
        }
      : elbOrg
  ) as unknown;
};

export const Triggers: { [key: string]: Walker.Trigger } = {
  Click: 'click',
  Custom: 'custom',
  Hover: 'hover',
  Load: 'load',
  Pulse: 'pulse',
  Scroll: 'scroll',
  Submit: 'submit',
  Visible: 'visible',
  Visibles: 'visibles',
  Wait: 'wait',
} as const;

export async function ready(
  fn: (collector: Collector.Instance, settings: any) => void,
  collector: Collector.Instance,
  settings: any,
): Promise<void> {
  const readyFn = () => {
    fn(collector, settings);
    // Only call onApply if collector has the on property
    if (collector?.on) {
      try {
        onApply(collector, 'ready');
      } catch (error) {
        // Don't throw - this is not critical for functionality
      }
    }
  };

  if (document.readyState !== 'loading') {
    readyFn();
  } else {
    document.addEventListener('DOMContentLoaded', readyFn);
  }
}

// Called once during source initialization to setup global listeners
export function initTriggers(
  collector: Collector.Instance,
  settings: Required<Settings>,
) {
  const { scope, prefix } = settings;
  initGlobalTrigger(collector, scope as Scope, prefix);
}

// Called on each walker run to process load triggers
export function processLoadTriggers(
  collector: Collector.Instance,
  settings: Required<Settings>,
) {
  const { prefix, scope } = settings;
  initScopeTrigger(collector, prefix, scope as Scope);
}

export function initGlobalTrigger(
  collector: Collector.Instance,
  scope: Scope,
  prefix: string,
): void {
  scope.addEventListener(
    'click',
    tryCatch(function (this: Scope, ev: unknown) {
      triggerClick.call(this, collector, ev as MouseEvent, prefix);
    }) as EventListener,
  );
  scope.addEventListener(
    'submit',
    tryCatch(function (this: Scope, ev: unknown) {
      triggerSubmit.call(this, collector, ev as SubmitEvent, prefix);
    }) as EventListener,
  );
}

export function initScopeTrigger(
  collector: Collector.Instance,
  prefix: string,
  elem?: Scope,
) {
  // Reset all scroll events @TODO check if it's right here
  scrollElements = [];

  // Clean up any existing visibility tracking to prevent observer accumulation
  destroyVisibilityTracking(collector);

  // Initialize visibility tracking for this collector
  initVisibilityTracking(collector, 1000);

  // default data-elbaction
  const selectorAction = getElbAttributeName(
    prefix,
    Const.Commands.Action,
    false,
  );

  const scope = elem || document;
  if (scope !== document) {
    // Handle the elements action(s), too
    handleActionElem(collector, scope as HTMLElement, selectorAction, prefix);
  }

  // Handle all children action(s)
  const elements = scope.querySelectorAll<HTMLElement>(`[${selectorAction}]`);

  elements.forEach((elem) => {
    handleActionElem(collector, elem, selectorAction, prefix);
  });

  if (scrollElements.length) scroll(collector, scope, prefix);
}

export async function handleTrigger(
  collector: Collector.Instance,
  prefix: string,
  element: Element,
  trigger: string,
  // @TODO add triggerParams to filter for specific trigger
): Promise<unknown[]> {
  const events = getEvents(element, trigger, prefix);
  return Promise.all(
    events.map((event: Walker.Event) =>
      translateToCoreCollector(collector, prefix, {
        event: `${event.entity} ${event.action}`,
        ...event,
        trigger,
      }),
    ),
  );
}

function handleActionElem(
  collector: Collector.Instance,
  elem: HTMLElement,
  selectorAction: string,
  prefix: string,
) {
  const actionAttr = getAttribute(elem, selectorAction);

  if (!actionAttr) return;

  // TriggersActionGroups ([trigger: string]: TriggerActions)
  Object.values(getTriggerActions(actionAttr)).forEach((triggerActions) =>
    // TriggerActions (Array<TriggerAction>)
    triggerActions.forEach((triggerAction: Walker.TriggerActions[0]) => {
      // TriggerAction ({ trigger, triggerParams, action, actionParams })
      switch (triggerAction.trigger) {
        case Triggers.Hover:
          triggerHover(collector, elem, prefix);
          break;
        case Triggers.Load:
          triggerLoad(collector, elem, prefix);
          break;
        case Triggers.Pulse:
          triggerPulse(collector, elem, triggerAction.triggerParams, prefix);
          break;
        case Triggers.Scroll:
          triggerScroll(elem, triggerAction.triggerParams);
          break;
        case Triggers.Visible:
          triggerVisible(collector, elem, { prefix });
          break;
        case Triggers.Visibles:
          triggerVisible(collector, elem, { multiple: true, prefix });
          break;
        case Triggers.Wait:
          triggerWait(collector, elem, triggerAction.triggerParams, prefix);
          break;
      }
    }),
  );
}

function triggerClick(
  collector: Collector.Instance,
  ev: MouseEvent,
  prefix: string,
) {
  handleTrigger(collector, prefix, ev.target as Element, Triggers.Click);
}

function triggerHover(
  collector: Collector.Instance,
  elem: HTMLElement,
  prefix: string,
) {
  elem.addEventListener(
    'mouseenter',
    tryCatch(function (this: Document, ev: MouseEvent) {
      if (ev.target instanceof Element)
        handleTrigger(collector, prefix, ev.target, Triggers.Hover);
    }),
  );
}

function triggerLoad(
  collector: Collector.Instance,
  elem: HTMLElement,
  prefix: string,
) {
  handleTrigger(collector, prefix, elem, Triggers.Load);
}

function triggerPulse(
  collector: Collector.Instance,
  elem: HTMLElement,
  triggerParams: string = '',
  prefix: string,
) {
  setInterval(
    () => {
      // Only trigger when tab is active
      if (!document.hidden)
        handleTrigger(collector, prefix, elem, Triggers.Pulse);
    },
    parseInt(triggerParams || '') || 15000,
  );
}

function triggerScroll(elem: HTMLElement, triggerParams: string = '') {
  // Scroll depth in percent, default 50%
  const depth = parseInt(triggerParams || '') || 50;

  // Ignore invalid parameters
  if (depth < 0 || depth > 100) return;

  scrollElements.push([elem, depth]);
}

function triggerSubmit(
  collector: Collector.Instance,
  ev: SubmitEvent,
  prefix: string,
) {
  if (ev.target) {
    handleTrigger(collector, prefix, ev.target as Element, Triggers.Submit);
  }
}

function triggerWait(
  collector: Collector.Instance,
  elem: HTMLElement,
  triggerParams: string = '',
  prefix: string,
) {
  setTimeout(
    () => handleTrigger(collector, prefix, elem, Triggers.Wait),
    parseInt(triggerParams || '') || 15000,
  );
}

function scroll(collector: Collector.Instance, scope: Scope, prefix: string) {
  const scrolling = (
    scrollElements: Walker.ScrollElements,
    collector: Collector.Instance,
    prefix: string,
  ) => {
    return scrollElements.filter(([element, depth]: [Element, number]) => {
      // Distance from top to the bottom of the visible screen
      const windowBottom = window.scrollY + window.innerHeight;
      // Distance from top to the elements relevant content
      const elemTop = (element as HTMLElement).offsetTop;

      // Skip calculations if not in viewport yet
      if (windowBottom < elemTop) return true;

      // Height of the elements box as 100 percent base
      const elemHeight = element.clientHeight;
      // Distance from top to the elements bottom
      const elemBottom = elemTop + elemHeight;
      // Height of the non-visible pixels below visible screen
      const hidden = elemBottom - windowBottom;
      // Visible percentage of the element
      const scrollDepth = (1 - hidden / (elemHeight || 1)) * 100;

      // Check if the elements visibility skipped the required border
      if (scrollDepth >= depth) {
        // Enough scrolling, it's time
        handleTrigger(collector, prefix, element, Triggers.Scroll);

        // Remove the element from scrollEvents
        return false;
      }

      // Keep observing the element
      return true;
    });
  };

  // Don't add unnecessary scroll listeners
  if (!scrollListener) {
    scrollListener = throttle(function () {
      scrollElements = scrolling.call(scope, scrollElements, collector, prefix);
    });

    scope.addEventListener('scroll', scrollListener);
  }
}
