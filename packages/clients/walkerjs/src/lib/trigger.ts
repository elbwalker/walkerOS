import type { Walker, WebClient } from '../types';
import { onApply } from './on';
import {
  getElbAttributeName,
  getEvents,
  getPageViewData,
  getTriggerActions,
} from './walker';
import {
  elb as elbOrg,
  Const,
  getAttribute,
  isVisible,
  throttle,
  tryCatch,
} from '@elbwalker/utils';

let visibleObserver: IntersectionObserver | undefined;
let scrollElements: Walker.ScrollElements = [];
let scrollListener: EventListenerOrEventListenerObject | undefined;

const elb = elbOrg as WebClient.Elb;
export { elb };

export const Trigger: { [key: string]: Walker.Trigger } = {
  Click: 'click',
  Custom: 'custom',
  Hover: 'hover',
  Load: 'load',
  Pulse: 'pulse',
  Scroll: 'scroll',
  Submit: 'submit',
  Visible: 'visible',
  Wait: 'wait',
} as const;

export function ready<T extends (...args: never[]) => R, R>(
  instance: WebClient.Instance,
  fn: T,
  ...args: Parameters<T>
): void {
  const readyFn = () => {
    onApply(instance, 'ready');
    fn(...args);
  };

  if (document.readyState !== 'loading') {
    readyFn();
  } else {
    document.addEventListener('DOMContentLoaded', readyFn);
    return;
  }
}

// Called for each new run to setup triggers
export function load(instance: WebClient.Instance) {
  const { pageview, prefix } = instance.config;
  // Trigger static page view if enabled
  if (pageview) {
    const [data, context] = getPageViewData(prefix);
    instance.config.elbLayer.push('page view', data, Trigger.Load, context);
    // elb('page view', data, Trigger.Load, context);
  }

  initScopeTrigger(instance);
}

export function initGlobalTrigger(instance: WebClient.Instance): void {
  document.addEventListener(
    'click',
    tryCatch(function (this: Document, ev: MouseEvent) {
      triggerClick.call(this, instance, ev);
    }),
  );
  document.addEventListener(
    'submit',
    tryCatch(function (this: Document, ev: SubmitEvent) {
      triggerSubmit.call(this, instance, ev);
    }),
  );
}

export function initScopeTrigger(
  instance: WebClient.Instance,
  scope: WebClient.Scope = document,
) {
  // Reset all scroll events @TODO check if it's right here
  scrollElements = [];

  // Load the visible observer
  visibleObserver =
    visibleObserver ||
    tryCatch(observerVisible, () => {
      return undefined;
    })(instance, 1000);

  // default data-elbaction
  const selectorAction = getElbAttributeName(
    instance.config.prefix,
    Const.Commands.Action,
    false,
  );

  if (scope === document) {
    // Disconnect previous on full loads
    visibleObserver && visibleObserver.disconnect();
  } else {
    // Handle the elements action(s), too
    handleActionElem(instance, scope as HTMLElement, selectorAction);
  }

  // Handle all children action(s)
  scope
    .querySelectorAll<HTMLElement>(`[${selectorAction}]`)
    .forEach((elem) => handleActionElem(instance, elem, selectorAction));

  if (scrollElements.length) scroll(instance);
}

function handleTrigger(
  instance: WebClient.Instance,
  element: Element,
  trigger: Walker.Trigger,
  // @TODO add triggerParams to filter for specific trigger
) {
  const events = getEvents(element, trigger, instance.config.prefix);
  events.forEach((event: Walker.Event) => {
    instance.config.elbLayer.push(
      `${event.entity} ${event.action}`,
      event.data,
      trigger,
      event.context,
      event.nested,
    );
  });
}

function handleActionElem(
  instance: WebClient.Instance,
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
          triggerHover(instance, elem);
          break;
        case Trigger.Load:
          triggerLoad(instance, elem);
          break;
        case Trigger.Pulse:
          triggerPulse(instance, elem, triggerAction.triggerParams);
          break;
        case Trigger.Scroll:
          triggerScroll(elem, triggerAction.triggerParams);
          break;
        case Trigger.Visible:
          triggerVisible(elem, visibleObserver);
          break;
        case Trigger.Wait:
          triggerWait(instance, elem, triggerAction.triggerParams);
          break;
      }
    }),
  );
}

function triggerClick(instance: WebClient.Instance, ev: MouseEvent) {
  handleTrigger(instance, ev.target as Element, Trigger.Click);
}

function triggerHover(instance: WebClient.Instance, elem: HTMLElement) {
  elem.addEventListener(
    'mouseenter',
    tryCatch(function (this: Document, ev: MouseEvent) {
      if (ev.target instanceof Element)
        handleTrigger(instance, ev.target, Trigger.Hover);
    }),
  );
}

function triggerLoad(instance: WebClient.Instance, elem: HTMLElement) {
  handleTrigger(instance, elem, Trigger.Load);
}

function triggerPulse(
  instance: WebClient.Instance,
  elem: HTMLElement,
  triggerParams: string = '',
) {
  setInterval(() => {
    // Only trigger when tab is active
    if (!document.hidden) handleTrigger(instance, elem, Trigger.Pulse);
  }, parseInt(triggerParams || '') || 15000);
}

function triggerScroll(elem: HTMLElement, triggerParams: string = '') {
  // Scroll depth in percent, default 50%
  const depth = parseInt(triggerParams || '') || 50;

  // Ignore invalid parameters
  if (depth < 0 || depth > 100) return;

  scrollElements.push([elem, depth]);
}

function triggerSubmit(instance: WebClient.Instance, ev: Event) {
  handleTrigger(instance, ev.target as Element, Trigger.Submit);
}

function triggerVisible(
  elem: HTMLElement,
  visibleObserver?: IntersectionObserver,
) {
  if (visibleObserver) visibleObserver!.observe(elem);
}

function triggerWait(
  instance: WebClient.Instance,
  elem: HTMLElement,
  triggerParams: string = '',
) {
  setTimeout(
    () => handleTrigger(instance, elem, Trigger.Wait),
    parseInt(triggerParams || '') || 15000,
  );
}

function scroll(instance: WebClient.Instance) {
  const scrolling = (
    scrollElements: Walker.ScrollElements,
    instance: WebClient.Instance,
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
        handleTrigger(instance, element, Trigger.Scroll);

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
      scrollElements = scrolling.call(document, scrollElements, instance);
    });

    document.addEventListener('scroll', scrollListener);
  }
}

function observerVisible(
  instance: WebClient.Instance,
  duration = 1000,
): IntersectionObserver | undefined {
  if (!window.IntersectionObserver) return;

  return new window.IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        const timerId = 'elbTimerId';

        // Check for an existing timer
        let timer = Number(target.dataset[timerId]);

        if (entry.intersectionRatio > 0) {
          // Check if a large target element is in viewport
          const largeElemInViewport =
            target.offsetHeight > window.innerHeight && isVisible(target);

          // Element is more than 50% in viewport
          if (largeElemInViewport || entry.intersectionRatio >= 0.5) {
            // Take existing scheduled function or create a new one
            timer =
              timer ||
              window.setTimeout(function () {
                if (isVisible(target)) {
                  handleTrigger(instance, target as Element, Trigger.Visible);
                  // Just count once
                  delete target.dataset[timerId];
                  if (visibleObserver) visibleObserver.unobserve(target);
                }
              }, duration);

            // Remember the timer, temporarily
            target.dataset[timerId] = String(timer);

            // We're done here
            return;
          }
        }

        // Element isn't in viewport
        // Clearing a timer is more easy than computing isVisible
        if (timer) {
          clearTimeout(timer);
          delete target.dataset[timerId];
        }
      });
    },
    {
      rootMargin: '0px',
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5], // Trigger for the first 50%
    },
  );
}
