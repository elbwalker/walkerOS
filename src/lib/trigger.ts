import { IElbwalker, Walker } from '../types';
import { resolveAttributes, getElbAttributeName, walker } from './walker';
import { throttle, trycatch } from './utils';

const d = document;
const w = window;
let observer: IntersectionObserver | undefined;
let scrollElements: Array<[HTMLElement, number]> = [];

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

export function initTrigger(instance: IElbwalker.Function): void {
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

  // Trigger hover
  d.querySelectorAll<HTMLElement>(
    getActionselector(instance.config.prefix, Walker.Trigger.Hover),
  ).forEach((element) => {
    element.addEventListener(
      'mouseenter',
      trycatch(function (this: Document, ev: MouseEvent) {
        if (ev.target instanceof Element)
          handleTrigger(ev.target, Walker.Trigger.Hover, instance);
      }),
    );
  });
}

// Called for each new run to setup triggers
export function triggerLoad(instance: IElbwalker.Function) {
  const prefix = instance.config.prefix;

  // Trigger static page view if enabled
  if (instance.config.pageview) view(instance);

  // @TODO Test if querying generic data-elbaction once and loop them might be better

  // Trigger load
  d.querySelectorAll(getActionselector(prefix, Walker.Trigger.Load)).forEach(
    (element) => {
      handleTrigger(element, Walker.Trigger.Load, instance);
    },
  );

  // Trigger wait
  d.querySelectorAll(getActionselector(prefix, Walker.Trigger.Wait)).forEach(
    (element) => {
      resolveAttributes(
        instance.config.prefix,
        element,
        Walker.Trigger.Wait,
      ).forEach((triggerAction) => {
        const waitTime = parseInt(triggerAction.triggerParams || '') || 15000;

        setTimeout(
          () => handleTrigger(element, Walker.Trigger.Wait, instance),
          waitTime,
        );
      });
    },
  );

  // Trigger pulse
  d.querySelectorAll(getActionselector(prefix, Walker.Trigger.Pulse)).forEach(
    (element) => {
      resolveAttributes(
        instance.config.prefix,
        element,
        Walker.Trigger.Pulse,
      ).forEach((triggerAction) => {
        const waitTime = parseInt(triggerAction.triggerParams || '') || 15000;

        setInterval(() => {
          // Only trigger when tab is active
          if (!document.hidden)
            handleTrigger(element, Walker.Trigger.Pulse, instance);
        }, waitTime);
      });
    },
  );

  // Trigger scroll
  // @TODO unlisten on empty scrollElements stack
  // @TODO pass instance and stack
  scrollElements = [];
  d.querySelectorAll<HTMLElement>(
    getActionselector(prefix, Walker.Trigger.Scroll),
  ).forEach((element) => {
    // Create scroll depth groups by percentage
    resolveAttributes(
      instance.config.prefix,
      element,
      Walker.Trigger.Scroll,
    ).forEach((triggerAction) => {
      // Scroll depth in percent, default 50%
      let depth = parseInt(triggerAction.triggerParams || '') || 50;

      // Ignore invalid parameters
      if (depth < 0 || depth > 100) return;

      scrollElements.push([element, depth]);
    });
  });

  // Don't add unnecessary scroll listeners
  if (scrollElements.length) {

    const scrolling = () => {
      scrollElements = scrollElements.filter(([element, depth]) => {
        // Distance from top to the bottom of the visible screen
        let windowBottom = window.scrollY + window.innerHeight;
        // Distance from top to the elements relevant content
        let elemTop = element.offsetTop;

        // Skip calulations if not in viewport yet
        if (windowBottom < elemTop) return true;

        // Height of the elements box as 100 percent base
        let elemHeight = element.clientHeight;
        // Distance from top to the elements bottom
        let elemBottom = elemTop + elemHeight;
        // Height of the non-visible pixels below visible screen
        let hidden = elemBottom - windowBottom;
        // Visible percentage of the element
        let scrollDepth = (1 - hidden / (elemHeight || 1)) * 100;

        // Check if the elements visibility skipped the required border
        if (scrollDepth >= depth) {
          // Enough scrolling, it's time
          handleTrigger(element, Walker.Trigger.Scroll, instance);

          // Remove the element from scrollEvents
          return false;
        }

        // Keep observing the element
        return true;
      });
    };

    window.addEventListener('scroll', throttle(scrolling, 2000));
  }

  // Trigger visible
  observer = trycatch(observerVisible)(instance, 1000);
  triggerVisible(prefix, d, true);
}

function triggerClick(ev: MouseEvent, instance: IElbwalker.Function) {
  handleTrigger(ev.target as Element, Walker.Trigger.Click, instance);
}

function triggerSubmit(ev: Event, instance: IElbwalker.Function) {
  handleTrigger(ev.target as Element, Walker.Trigger.Submit, instance);
}

export function triggerVisible(
  prefix: string,
  scope: Walker.Scope,
  disconnect = false,
): IntersectionObserver | undefined {
  if (observer) {
    // Disconnect previous
    if (disconnect) observer.disconnect();

    const visibleSelector = getActionselector(prefix, Walker.Trigger.Visible);

    scope.querySelectorAll(visibleSelector).forEach((element) => {
      observer!.observe(element);
    });
  }

  return observer;
}

function view(instance: IElbwalker.Function) {
  // static page view
  const l = w.location;
  const data = {
    domain: l.hostname,
    id: l.pathname,
    title: d.title,
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

        if (entry.intersectionRatio >= 0.5) {
          const timer = w.setTimeout(function () {
            if (isVisible(target)) {
              handleTrigger(
                target as Element,
                Walker.Trigger.Visible,
                instance,
              );
              // Just count once
              delete target.dataset[timerId];
              if (observer) observer.unobserve(target);
            }
          }, duration);

          target.dataset[timerId] = String(timer);
        } else {
          if (target.dataset[timerId]) {
            clearTimeout(Number(target.dataset[timerId]));
            delete target.dataset[timerId];
          }
        }
      });
    },
    {
      rootMargin: '0px',
      threshold: [0.5],
    },
  );
}

// https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom#41698614
// @TODO bugfix when element bigger than viewport
function isVisible(elem: HTMLElement): boolean {
  const style = getComputedStyle(elem);

  if (style.display === 'none') return false;
  if (style.visibility !== 'visible') return false;
  if (Number(style.opacity) < 0.1) return false;
  if (
    elem.offsetWidth +
      elem.offsetHeight +
      elem.getBoundingClientRect().height +
      elem.getBoundingClientRect().width ===
    0
  ) {
    return false;
  }
  const elemCenter = {
    x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
    y: elem.getBoundingClientRect().top + elem.offsetHeight / 2,
  };
  if (elemCenter.x < 0) return false;
  if (elemCenter.x > (d.documentElement.clientWidth || w.innerWidth))
    return false;
  if (elemCenter.y < 0) return false;
  if (elemCenter.y > (d.documentElement.clientHeight || w.innerHeight))
    return false;
  let pointContainer = d.elementFromPoint(elemCenter.x, elemCenter.y);
  if (pointContainer) {
    do {
      if (pointContainer === elem) return true;
    } while ((pointContainer = pointContainer.parentElement));
  }
  return false;
}

function handleTrigger(
  element: Element,
  trigger: Walker.Trigger,
  instance: IElbwalker.Function,
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

function getActionselector(prefix: string, trigger: string) {
  // @TODO dealing with wildcart edge-case
  // when the 'load' term is in selector but not as a trigger

  return `[${getElbAttributeName(
    prefix,
    IElbwalker.Commands.Action,
    false,
  )}*=${trigger}]`;
}
