import type { Elbwalker, Walker } from '../types';
import { getElbAttributeName, getEvents, getTriggerActions } from './walker';
import { getAttribute, isVisible, throttle, trycatch } from './utils';
import Const from './constants';

let visibleObserver: IntersectionObserver | undefined;
let scrollElements: Walker.ScrollElements = [];
let scrollListener: EventListenerOrEventListenerObject | undefined;

export function ready(run: Function, instance: Elbwalker.Function) {
  const fn = () => {
    run(instance);
  };
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

// Called for each new run to setup triggers
export function load(instance: Elbwalker.Function) {
  // Trigger static page view if enabled
  if (instance.config.pageview) pageView(instance);

  initScopeTrigger(instance);
}

export function initGlobalTrigger(instance: Elbwalker.Function): void {
  document.addEventListener(
    'click',
    trycatch(function (this: Document, ev: MouseEvent) {
      triggerClick.call(this, instance, ev);
    }),
  );
  document.addEventListener(
    'submit',
    trycatch(function (this: Document, ev: SubmitEvent) {
      triggerSubmit.call(this, instance, ev);
    }),
  );
}

export function initScopeTrigger(
  instance: Elbwalker.Function,
  scope: Elbwalker.Scope = document,
) {
  // Reset all scroll events @TODO check if it's right here
  scrollElements = [];

  // Load the visible observer
  visibleObserver =
    visibleObserver || trycatch(observerVisible)(instance, 1000);

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
  instance: Elbwalker.Function,
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
  instance: Elbwalker.Function,
  elem: HTMLElement,
  selectorAction: string,
) {
  const actionAttr = getAttribute(elem, selectorAction);

  if (!actionAttr) return;

  // TriggersActionGroups ([trigger: string]: TriggerActions)
  Object.values(getTriggerActions(actionAttr)).forEach((triggerActions) =>
    // TriggerActions (Array<TriggerAction>)
    triggerActions.forEach((triggerAction) => {
      // TriggerAction ({ trigger, triggerParams, action, actionparams })
      switch (triggerAction.trigger) {
        case Const.Trigger.Hover:
          triggerHover(instance, elem);
          break;
        case Const.Trigger.Load:
          triggerLoad(instance, elem);
          break;
        case Const.Trigger.Pulse:
          triggerPulse(instance, elem, triggerAction.triggerParams);
          break;
        case Const.Trigger.Scroll:
          triggerScroll(elem, triggerAction.triggerParams);
          break;
        case Const.Trigger.Visible:
          triggerVisible(elem, visibleObserver);
          break;
        case Const.Trigger.Wait:
          triggerWait(instance, elem, triggerAction.triggerParams);
          break;
      }
    }),
  );
}

function triggerClick(instance: Elbwalker.Function, ev: MouseEvent) {
  handleTrigger(instance, ev.target as Element, Const.Trigger.Click);
}

function triggerHover(instance: Elbwalker.Function, elem: HTMLElement) {
  elem.addEventListener(
    'mouseenter',
    trycatch(function (this: Document, ev: MouseEvent) {
      if (ev.target instanceof Element)
        handleTrigger(instance, ev.target, Const.Trigger.Hover);
    }),
  );
}

function triggerLoad(instance: Elbwalker.Function, elem: HTMLElement) {
  handleTrigger(instance, elem, Const.Trigger.Load);
}

function triggerPulse(
  instance: Elbwalker.Function,
  elem: HTMLElement,
  triggerParams: string = '',
) {
  setInterval(
    () => {
      // Only trigger when tab is active
      if (!document.hidden) handleTrigger(instance, elem, Const.Trigger.Pulse);
    },
    parseInt(triggerParams || '') || 15000,
  );
}

function triggerScroll(elem: HTMLElement, triggerParams: string = '') {
  // Scroll depth in percent, default 50%
  let depth = parseInt(triggerParams || '') || 50;

  // Ignore invalid parameters
  if (depth < 0 || depth > 100) return;

  scrollElements.push([elem, depth]);
}

function triggerSubmit(instance: Elbwalker.Function, ev: Event) {
  handleTrigger(instance, ev.target as Element, Const.Trigger.Submit);
}

function triggerVisible(
  elem: HTMLElement,
  visibleObserver?: IntersectionObserver,
) {
  if (visibleObserver) visibleObserver!.observe(elem);
}

function triggerWait(
  instance: Elbwalker.Function,
  elem: HTMLElement,
  triggerParams: string = '',
) {
  setTimeout(
    () => handleTrigger(instance, elem, Const.Trigger.Wait),
    parseInt(triggerParams || '') || 15000,
  );
}

function scroll(instance: Elbwalker.Function) {
  const scrolling = (
    scrollElements: Walker.ScrollElements,
    instance: Elbwalker.Function,
  ) => {
    return scrollElements.filter(([element, depth]) => {
      // Distance from top to the bottom of the visible screen
      const windowBottom = window.scrollY + window.innerHeight;
      // Distance from top to the elements relevant content
      const elemTop = element.offsetTop;

      // Skip calulations if not in viewport yet
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
        handleTrigger(instance, element, Const.Trigger.Scroll);

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

function pageView(instance: Elbwalker.Function) {
  // static page view
  const loc = window.location;
  const data: Walker.Properties = {
    domain: loc.hostname,
    title: document.title,
    referrer: document.referrer,
  };
  if (loc.search) data.search = loc.search;
  if (loc.hash) data.hash = loc.hash;

  // @TODO get all nested entities
  instance.config.elbLayer.push('page view', data, Const.Trigger.Load);
}

function observerVisible(
  instance: Elbwalker.Function,
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
                  handleTrigger(
                    instance,
                    target as Element,
                    Const.Trigger.Visible,
                  );
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
