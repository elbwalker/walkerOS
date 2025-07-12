import type { Walker, WebCollector, Elb } from '../types';
import { Const, onApply, throttle, tryCatch } from '@walkerOS/core';
import { elb as elbOrg, getAttribute } from '../utils';
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

let scrollElements: Walker.ScrollElements = [];
let scrollListener: EventListenerOrEventListenerObject | undefined;

export const createElb: (customLayer?: Elb.Layer) => Elb.Fn = (
  customLayer?,
) => {
  return (
    customLayer
      ? function () {
          customLayer.push(arguments);
        }
      : elbOrg
  ) as Elb.Fn;
};

export const Trigger: { [key: string]: Walker.Trigger } = {
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

export async function ready<T extends (...args: never[]) => R, R>(
  collector: WebCollector.Collector,
  fn: T,
  ...args: Parameters<T>
): Promise<R | undefined> {
  const readyFn = () => {
    const result = fn(...args);
    onApply(collector, 'ready');
    return result;
  };

  if (!collector.config.listeners) return fn(...args);

  if (document.readyState !== 'loading') {
    return readyFn();
  } else {
    document.addEventListener('DOMContentLoaded', readyFn);
  }
}

// Called for each new run to setup triggers
export function load(collector: WebCollector.Collector) {
  if (!collector.config.listeners) return;

  const { pageview, prefix, scope } = collector.config;
  // Trigger static page view if enabled
  if (pageview) {
    const [data, context] = getPageViewData(prefix, scope);
    collector.push('page view', data, Trigger.Load, context);
  }

  initScopeTrigger(collector);
}

export function initGlobalTrigger(collector: WebCollector.Collector): void {
  if (!collector.config.listeners) return;

  const scope = collector.config.scope;

  scope.addEventListener(
    'click',
    tryCatch(function (this: WebCollector.Scope, ev: Event) {
      triggerClick.call(this, collector, ev as MouseEvent);
    }),
  );
  scope.addEventListener(
    'submit',
    tryCatch(function (this: WebCollector.Scope, ev: Event) {
      triggerSubmit.call(this, collector, ev);
    }),
  );
}

export function initScopeTrigger(
  collector: WebCollector.Collector,
  elem?: WebCollector.Scope,
) {
  if (!collector.config.listeners) return;

  // Reset all scroll events @TODO check if it's right here
  scrollElements = [];

  // Clean up any existing visibility tracking to prevent observer accumulation
  destroyVisibilityTracking(collector);

  // Initialize visibility tracking for this collector
  initVisibilityTracking(collector, 1000);

  // default data-elbaction
  const selectorAction = getElbAttributeName(
    collector.config.prefix,
    Const.Commands.Action,
    false,
  );

  const scope = elem || collector.config.scope;
  if (scope !== document) {
    // Handle the elements action(s), too
    handleActionElem(collector, scope as HTMLElement, selectorAction);
  }

  // Handle all children action(s)
  scope
    .querySelectorAll<HTMLElement>(`[${selectorAction}]`)
    .forEach((elem) => handleActionElem(collector, elem, selectorAction));

  if (scrollElements.length) scroll(collector);
}

export async function handleTrigger(
  collector: WebCollector.Collector,
  element: Element,
  trigger: Walker.Trigger,
  // @TODO add triggerParams to filter for specific trigger
): Promise<unknown[]> {
  const events = getEvents(element, trigger, collector.config.prefix);
  return Promise.all(
    events.map((event: Walker.Event) =>
      collector.push({
        event: `${event.entity} ${event.action}`,
        ...event,
        trigger,
      }),
    ),
  );
}

function handleActionElem(
  collector: WebCollector.Collector,
  elem: HTMLElement,
  selectorAction: string,
) {
  const actionAttr = getAttribute(elem, selectorAction);

  if (!actionAttr) return;

  // TriggersActionGroups ([trigger: string]: TriggerActions)
  Object.values(getTriggerActions(actionAttr)).forEach((triggerActions) =>
    // TriggerActions (Array<TriggerAction>)
    triggerActions.forEach((triggerAction) => {
      // TriggerAction ({ trigger, triggerParams, action, actionParams })
      switch (triggerAction.trigger) {
        case Trigger.Hover:
          triggerHover(collector, elem);
          break;
        case Trigger.Load:
          triggerLoad(collector, elem);
          break;
        case Trigger.Pulse:
          triggerPulse(collector, elem, triggerAction.triggerParams);
          break;
        case Trigger.Scroll:
          triggerScroll(elem, triggerAction.triggerParams);
          break;
        case Trigger.Visible:
          triggerVisible(collector, elem);
          break;
        case Trigger.Visibles:
          triggerVisible(collector, elem, { multiple: true });
          break;
        case Trigger.Wait:
          triggerWait(collector, elem, triggerAction.triggerParams);
          break;
      }
    }),
  );
}

function triggerClick(collector: WebCollector.Collector, ev: MouseEvent) {
  handleTrigger(collector, ev.target as Element, Trigger.Click);
}

function triggerHover(collector: WebCollector.Collector, elem: HTMLElement) {
  elem.addEventListener(
    'mouseenter',
    tryCatch(function (this: Document, ev: MouseEvent) {
      if (ev.target instanceof Element)
        handleTrigger(collector, ev.target, Trigger.Hover);
    }),
  );
}

function triggerLoad(collector: WebCollector.Collector, elem: HTMLElement) {
  handleTrigger(collector, elem, Trigger.Load);
}

function triggerPulse(
  collector: WebCollector.Collector,
  elem: HTMLElement,
  triggerParams: string = '',
) {
  setInterval(
    () => {
      // Only trigger when tab is active
      if (!document.hidden) handleTrigger(collector, elem, Trigger.Pulse);
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

function triggerSubmit(collector: WebCollector.Collector, ev: Event) {
  handleTrigger(collector, ev.target as Element, Trigger.Submit);
}

function triggerWait(
  collector: WebCollector.Collector,
  elem: HTMLElement,
  triggerParams: string = '',
) {
  setTimeout(
    () => handleTrigger(collector, elem, Trigger.Wait),
    parseInt(triggerParams || '') || 15000,
  );
}

function scroll(collector: WebCollector.Collector) {
  const scrolling = (
    scrollElements: Walker.ScrollElements,
    collector: WebCollector.Collector,
  ) => {
    return scrollElements.filter(([element, depth]) => {
      // Distance from top to the bottom of the visible screen
      const windowBottom = window.scrollY + window.innerHeight;
      // Distance from top to the elements relevant content
      const elemTop = element.offsetTop;

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
        handleTrigger(collector, element, Trigger.Scroll);

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
      scrollElements = scrolling.call(
        collector.config.scope,
        scrollElements,
        collector,
      );
    });

    collector.config.scope.addEventListener('scroll', scrollListener);
  }
}
