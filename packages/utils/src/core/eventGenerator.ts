import type { WalkerOS } from '@elbwalker/types';
import { assign } from '../web';

export function createEvent(props: WalkerOS.PartialEvent = {}): WalkerOS.Event {
  const timestamp = props.timestamp || new Date().setHours(0, 13, 37, 0);
  const group = props.group || 'gr0up';
  const count = props.count || 1;
  const id = `${timestamp}-${group}-${count}`;

  const defaultEvent: WalkerOS.Event = {
    event: 'entity action',
    data: {
      string: 'foo',
      number: 1,
      boolean: true,
      array: [0, 'text', false],
      not: undefined,
    },
    context: { dev: ['test', 1] },
    globals: { lang: 'elb' },
    custom: { completely: 'random' },
    user: { id: 'us3r', device: 'c00k13', session: 's3ss10n' },
    nested: [
      {
        type: 'child',
        data: { is: 'subordinated' },
        nested: [],
        context: { element: ['child', 0] },
      },
    ],
    consent: { functional: true },
    id,
    trigger: 'test',
    entity: 'entity',
    action: 'action',
    timestamp,
    timing: 3.14,
    group,
    count,
    version: {
      client: '0.0.7',
      tagging: 1,
    },
    source: {
      type: 'web',
      id: 'https://localhost:80',
      previous_id: 'http://remotehost:9001',
    },
  };

  // Note: Always prefer the props over the defaults

  // Merge properties
  const event = assign(defaultEvent, props, { merge: false });

  // Update conditions

  // Entity and action from event
  if (props.event) {
    const [entity, action] = props.event.split(' ') ?? [];

    if (entity && action) {
      event.entity = entity;
      event.action = action;
    }
  }

  return event;
}

export function getEvent(
  name: string,
  props: WalkerOS.PartialEvent = {},
): WalkerOS.Event {
  const product1 = {
    data: {
      name: 'Everyday Ruck Snack',
      color: 'black',
      size: 'l',
      prize: 420,
    },
  };
  const product2 = {
    data: {
      name: 'Cool Cap',
      size: 'one size',
      prize: 42,
    },
  };

  const defaultEvents: Record<string, WalkerOS.PartialEvent> = {
    'order complete': {
      data: {
        id: '0rd3r1d',
        currency: 'EUR',
        shipping: 5.22,
        taxes: 73.76,
        total: 555,
      },
      nested: [
        {
          type: 'product',
          ...product1,
          context: {},
          nested: [],
        },
        {
          type: 'product',
          ...product2,
          context: {},
          nested: [],
        },
        {
          type: 'gift',
          data: {
            name: 'Surprise',
          },
          context: {},
          nested: [],
        },
      ],
      trigger: 'load',
    },
    'page view': {
      data: {
        domain: 'www.example.com',
        title: 'walkerOS',
        referrer: 'https://www.elbwalker.com/',
        search: '?foo=bar',
        hash: '#hash',
        id: '/path/to/page',
      },
      trigger: 'load',
    },
    'product view': {
      ...product1,
      nested: [],
      trigger: 'load',
    },
    'promotion visible': {
      data: {
        name: 'Setting up tracking easily',
        position: 'hero',
      },
      trigger: 'visible',
    },
  };

  return createEvent({ ...defaultEvents[name], ...props, event: name });
}
