import { IElbwalker, Walker } from '../types';
import { getElbAttributeName, walker } from './walker';
import { trycatch } from './utils';

const d = document;
const w = window;
let observer: IntersectionObserver | undefined;

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
    getActionselector(instance.config.prefix, 'hover'),
  ).forEach((element) => {
    element.addEventListener(
      'mouseenter',
      trycatch(function (this: Document, ev: MouseEvent) {
        if (ev.target instanceof Element)
          handleTrigger(ev.target, 'hover', instance);
      }),
    );
  });
}

// Called for each new run to setup triggers
export function triggerLoad(instance: IElbwalker.Function) {
  const prefix = instance.config.prefix;

  // Trigger static page view
  view(instance);

  // Trigger load
  d.querySelectorAll(getActionselector(prefix, 'load')).forEach((element) => {
    handleTrigger(element, 'load', instance);
  });

  // Trigger wait
  d.querySelectorAll(getActionselector(prefix, 'wait')).forEach((element) => {
    setTimeout(() => handleTrigger(element, 'wait', instance), 4000); // @TODO use dynamic value
  });

  // Trigger visible
  observer = trycatch(observerVisible)(instance, 1000);
  triggerVisible(prefix, d, true);
}

function triggerClick(ev: MouseEvent, instance: IElbwalker.Function) {
  handleTrigger(ev.target as Element, 'click', instance);
}

function triggerSubmit(ev: Event, instance: IElbwalker.Function) {
  handleTrigger(ev.target as Element, 'submit', instance);
}

export function triggerVisible(
  prefix: string,
  scope: Document | Element,
  disconnect = false,
): IntersectionObserver | undefined {
  if (observer) {
    // Disconnect previous
    if (disconnect) observer.disconnect();

    const visibleSelector = getActionselector(prefix, 'visible');

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
  } as Walker.EntityData;
  if (l.search) data.search = l.search;
  if (l.hash) data.hash = l.hash;

  // @TODO get all nested entities
  instance.config.elbLayer.push('page view', data, 'load');
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
              handleTrigger(target as Element, 'visible', instance);
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
) {
  const events = walker(element, trigger, instance.config.prefix);
  events.forEach((event: Walker.Event) => {
    instance.config.elbLayer.push(
      `${event.entity} ${event.action}`,
      event.data,
      trigger,
      event.nested,
    );
  });
}

function getActionselector(prefix: string, trigger: string) {
  // @TODO dealing with wildcart edge-case
  // when the 'load' term is in selector but not as a trigger

  return `[${getElbAttributeName(prefix, 'action', false)}*=${trigger}]`;
}
