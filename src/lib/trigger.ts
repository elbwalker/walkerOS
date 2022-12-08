import { IElbwalker, Walker } from '../types';
import { getElbAttributeName, walker, getTriggerActions } from './walker';
import { isVisible, throttle, trycatch } from './utils';

const d = document;
const w = window;
let visibleObserver: IntersectionObserver | undefined;
let scrollElements: Walker.ScrollElements = [];
let scrollListener: EventListenerOrEventListenerObject | undefined;

export function ready(run: Function, instance: IElbwalker.Function) {
  const fn = () => {
    run(instance);
  };
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

export function initStaticTrigger(instance: IElbwalker.Function): void {
  d.addEventListener(
    'click',
    trycatch(function (this: Document, ev: MouseEvent) {
      triggerClick.call(this, ev, instance);
    }),
  );
  d.addEventListener(
    'submit',
    trycatch(function (this: Document, ev: SubmitEvent) {
      triggerSubmit.call(this, ev, instance);
    }),
  );
}

export function initDynamicTrigger(
  instance: IElbwalker.Function,
  scope: IElbwalker.Scope = d,
) {
  // Reset all scroll events @TODO check if it's right here
  scrollElements = [];

  // Load the visible observer
  visibleObserver =
    visibleObserver || trycatch(observerVisible)(instance, 1000);

  // default data-elbaction
  const selectorAction = getElbAttributeName(
    instance.config.prefix,
    IElbwalker.Commands.Action,
    false,
  );

  if (scope === d) {
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

  if (scrollElements.length) triggerScroll(instance);
}

function handleActionElem(
  instance: IElbwalker.Function,
  elem: HTMLElement,
  selectorAction: string,
) {
  const actionAttr = elem.getAttribute(selectorAction);

  if (!actionAttr) return;

  // TriggersActionGroups ([trigger: string]: TriggerActions)
  Object.values(getTriggerActions(actionAttr)).forEach((triggerActions) =>
    // TriggerActions (Array<TriggerAction>)
    triggerActions.forEach((triggerAction) => {
      // TriggerAction ({ trigger, triggerParams, action, actionparams })
      switch (triggerAction.trigger) {
        case Walker.Trigger.Load:
          handleTrigger(instance, elem, Walker.Trigger.Load);
          break;
        case Walker.Trigger.Wait:
          setTimeout(
            () => handleTrigger(instance, elem, Walker.Trigger.Wait),
            parseInt(triggerAction.triggerParams || '') || 15000,
          );
          break;
        case Walker.Trigger.Pulse:
          setInterval(() => {
            // Only trigger when tab is active
            if (!document.hidden)
              handleTrigger(instance, elem, Walker.Trigger.Pulse);
          }, parseInt(triggerAction.triggerParams || '') || 15000);
          break;
        case Walker.Trigger.Hover:
          elem.addEventListener(
            'mouseenter',
            trycatch(function (this: Document, ev: MouseEvent) {
              if (ev.target instanceof Element)
                handleTrigger(instance, ev.target, Walker.Trigger.Hover);
            }),
          );
          break;
        case Walker.Trigger.Scroll:
          // Scroll depth in percent, default 50%
          let depth = parseInt(triggerAction.triggerParams || '') || 50;

          // Ignore invalid parameters
          if (depth < 0 || depth > 100) return;

          scrollElements.push([elem, depth]);
          break;
        case Walker.Trigger.Visible:
          if (!visibleObserver) return;
          visibleObserver!.observe(elem);
          break;
      }
    }),
  );
}

// Called for each new run to setup triggers
export function triggerLoad(instance: IElbwalker.Function) {
  // Trigger static page view if enabled
  if (instance.config.pageview) view(instance);

  initDynamicTrigger(instance);
}

function triggerClick(ev: MouseEvent, instance: IElbwalker.Function) {
  handleTrigger(instance, ev.target as Element, Walker.Trigger.Click);
}

function triggerSubmit(ev: Event, instance: IElbwalker.Function) {
  handleTrigger(instance, ev.target as Element, Walker.Trigger.Submit);
}

function triggerScroll(instance: IElbwalker.Function) {
  const scrolling = (
    scrollElements: Walker.ScrollElements,
    instance: IElbwalker.Function,
  ) => {
    return scrollElements.filter(([element, depth]) => {
      // Distance from top to the bottom of the visible screen
      const windowBottom = w.scrollY + w.innerHeight;
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
        handleTrigger(instance, element, Walker.Trigger.Scroll);

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

    d.addEventListener('scroll', scrollListener);
  }
}

function view(instance: IElbwalker.Function) {
  // static page view
  const l = w.location;
  const data = {
    domain: l.hostname,
    title: d.title,
    referrer: d.referrer,
  } as Walker.Properties;
  if (l.search) data.search = l.search;
  if (l.hash) data.hash = l.hash;

  // @TODO get all nested entities
  instance.config.elbLayer.push('page view', data, Walker.Trigger.Load);
}

function observerVisible(
  instance: IElbwalker.Function,
  duration = 1000,
): IntersectionObserver | undefined {
  if (!w.IntersectionObserver) return;

  return new w.IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        const timerId = 'elbTimerId';

        // Check for an existing timer
        let timer = Number(target.dataset[timerId]);

        if (entry.intersectionRatio > 0) {
          // Check if a large target element is in viewport
          const largeElemInViewport =
            target.offsetHeight > w.innerHeight && isVisible(target);

          // Element is more than 50% in viewport
          if (largeElemInViewport || entry.intersectionRatio >= 0.5) {
            // Take existing scheduled function or create a new one
            timer =
              timer ||
              w.setTimeout(function () {
                if (isVisible(target)) {
                  handleTrigger(
                    instance,
                    target as Element,
                    Walker.Trigger.Visible,
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

function handleTrigger(
  instance: IElbwalker.Function,
  element: Element,
  trigger: Walker.Trigger,
  // @TODO add triggerParams to filter for specific trigger
) {
  const events = walker(element, trigger, instance.config.prefix);
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
