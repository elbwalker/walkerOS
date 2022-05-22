import { getElbAttributeName, walker } from './walker';
import { trycatch } from './utils';
import { Elbwalker, Walker } from '@elbwalker/types';

const d = document;
const w = window;
const observer = trycatch(observerVisible)(1000, 'elb'); //TODO

export function ready(run: Function, elbwalker: Elbwalker.Function) {
  const fn = () => {
    run(elbwalker);
  };
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

export function initHandler(prefix: string): void {
  d.addEventListener(
    'click',
    trycatch(function (this: Document, ev: MouseEvent) {
      triggerClick.call(this, ev, prefix);
    }),
  );
  d.addEventListener(
    'submit',
    trycatch(function (this: Document, ev: SubmitEvent) {
      triggerSubmit.call(this, ev, prefix);
    }),
  );
  d.addEventListener(
    'submit',
    trycatch(function (this: Document, ev: SubmitEvent) {
      triggerSubmit.call(this, ev, prefix);
    }),
  );
}

// Called for each new run to setup triggers
export function triggerLoad(prefix: string) {
  // Trigger static page view
  view();

  // Trigger load
  d.querySelectorAll(getActionselector(prefix, 'load')).forEach((element) => {
    handleTrigger(element, 'load', prefix);
  });

  // Trigger wait
  d.querySelectorAll(getActionselector(prefix, 'wait')).forEach((element) => {
    setTimeout(() => handleTrigger(element, 'wait', prefix), 4000); // @TODO use dynamic value
  });

  // Trigger visible
  triggerVisible(prefix, d, true);
}

function triggerClick(ev: MouseEvent, prefix: string) {
  handleTrigger(ev.target as Element, 'click', prefix);
}

function triggerSubmit(ev: Event, prefix: string) {
  handleTrigger(ev.target as Element, 'submit', prefix);
}

export function triggerVisible(
  prefix: string,
  scope: Document | Element,
  disconnect = false,
): IntersectionObserver | undefined {
  if (observer) {
    // Disconnect previous
    if (disconnect) observer.disconnect();

    // support both elbaction and legacy selector elb-action
    const visibleSelector = getActionselector(prefix, 'visible');

    scope.querySelectorAll(visibleSelector).forEach((element) => {
      observer.observe(element);
    });
  }

  return observer;
}

function view() {
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
  w.elbLayer.push('page view', data, 'load');
}

function observerVisible(
  duration = 1000,
  prefix: string,
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
              handleTrigger(target as Element, 'visible', prefix);

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
  prefix: string,
) {
  const events = walker(element, trigger, prefix);
  events.forEach((event) => {
    w.elbLayer.push(
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

  // support both elbaction and legacy selector elb-action

  return `[${getElbAttributeName(
    prefix,
    'action',
    false,
  )}*=${trigger}],[${getElbAttributeName(prefix, 'action')}*=${trigger}]`;
}
