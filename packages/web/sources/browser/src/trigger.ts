import type { WalkerOS, Collector } from '@walkeros/core';
import type { Walker } from '@walkeros/web-core';
import type { Scope, Settings, Context } from './types';
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
  fn: (context: Context, settings: Settings) => void,
  context: Context,
  settings: Settings,
): Promise<void> {
  const readyFn = () => {
    fn(context, settings);
  };

  if (document.readyState !== 'loading') {
    readyFn();
  } else {
    document.addEventListener('DOMContentLoaded', readyFn);
  }
}

// Called once during source initialization to setup global listeners
export function initTriggers(context: Context, settings: Settings) {
  if (!settings.scope) return; // Skip if no scope available
  const requiredSettings = settings as Required<Settings>;
  initGlobalTrigger(context, requiredSettings);
}

// Called on each walker run to process load triggers
export function processLoadTriggers(context: Context, settings: Settings) {
  if (!settings.scope) return; // Skip if no scope available
  const requiredSettings = settings as Required<Settings>;
  initScopeTrigger(context, requiredSettings);
}

export function initGlobalTrigger(context: Context, settings: Settings): void {
  const scope = settings.scope;

  if (!scope) return;

  scope.addEventListener(
    'click',
    tryCatch(function (this: Scope, ev: unknown) {
      triggerClick.call(this, context, ev as MouseEvent);
    }) as EventListener,
  );
  scope.addEventListener(
    'submit',
    tryCatch(function (this: Scope, ev: unknown) {
      triggerSubmit.call(this, context, ev as SubmitEvent);
    }) as EventListener,
  );
}

export function initScopeTrigger(context: Context, settings: Settings) {
  const elem = settings.scope;

  // Reset all scroll events @TODO check if it's right here
  scrollElements = [];

  // Clean up any existing visibility tracking to prevent observer accumulation
  destroyVisibilityTracking();

  // Initialize visibility tracking for the browser source
  initVisibilityTracking(1000);

  // default data-elbaction
  const selectorAction = getElbAttributeName(
    settings.prefix,
    Const.Commands.Action,
    false,
  );

  const scope = elem || document;
  if (scope !== document) {
    // Handle the elements action(s), too
    handleActionElem(context, scope as HTMLElement, selectorAction, settings);
  }

  // Handle all children action(s)
  const elements = scope.querySelectorAll<HTMLElement>(`[${selectorAction}]`);

  elements.forEach((elem) => {
    handleActionElem(context, elem, selectorAction, settings);
  });

  if (scrollElements.length) scroll(context, scope, settings);
}

export async function handleTrigger(
  context: Context,
  element: Element,
  trigger: string,
  // @TODO add triggerParams to filter for specific trigger
): Promise<unknown[]> {
  const events = getEvents(element, trigger, context.settings.prefix);
  return Promise.all(
    events.map((event: Walker.Event) =>
      translateToCoreCollector(context, {
        event: `${event.entity} ${event.action}`,
        ...event,
        trigger,
      }),
    ),
  );
}

function handleActionElem(
  context: Context,
  elem: HTMLElement,
  selectorAction: string,
  settings: Settings,
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
          triggerHover(context, elem);
          break;
        case Triggers.Load:
          triggerLoad(context, elem);
          break;
        case Triggers.Pulse:
          triggerPulse(context, elem, triggerAction.triggerParams);
          break;
        case Triggers.Scroll:
          triggerScroll(elem, triggerAction.triggerParams);
          break;
        case Triggers.Visible:
          triggerVisible(context, elem);
          break;
        case Triggers.Visibles:
          triggerVisible(context, elem, { multiple: true });
          break;
        case Triggers.Wait:
          triggerWait(context, elem, triggerAction.triggerParams);
          break;
      }
    }),
  );
}

function triggerClick(context: Context, ev: MouseEvent) {
  handleTrigger(context, ev.target as Element, Triggers.Click);
}

function triggerHover(context: Context, elem: HTMLElement) {
  elem.addEventListener(
    'mouseenter',
    tryCatch(function (this: Document, ev: MouseEvent) {
      if (ev.target instanceof Element)
        handleTrigger(context, ev.target, Triggers.Hover);
    }),
  );
}

function triggerLoad(context: Context, elem: HTMLElement) {
  handleTrigger(context, elem, Triggers.Load);
}

function triggerPulse(
  context: Context,
  elem: HTMLElement,
  triggerParams: string = '',
) {
  setInterval(
    () => {
      // Only trigger when tab is active
      if (!document.hidden) handleTrigger(context, elem, Triggers.Pulse);
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

function triggerSubmit(context: Context, ev: SubmitEvent) {
  if (ev.target) {
    handleTrigger(context, ev.target as Element, Triggers.Submit);
  }
}

function triggerWait(
  context: Context,
  elem: HTMLElement,
  triggerParams: string = '',
) {
  setTimeout(
    () => handleTrigger(context, elem, Triggers.Wait),
    parseInt(triggerParams || '') || 15000,
  );
}

function scroll(context: Context, scope: Scope, settings: Settings) {
  const scrolling = (
    scrollElements: Walker.ScrollElements,
    context: Context,
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
        handleTrigger(context, element, Triggers.Scroll);

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
      scrollElements = scrolling.call(scope, scrollElements, context);
    });

    scope.addEventListener('scroll', scrollListener);
  }
}
