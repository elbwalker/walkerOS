import type { WalkerOS } from './types';
import { assign } from './assign';

declare const __VERSION__: string;

/**
 * Creates a complete event with default values.
 * Used for testing and debugging.
 *
 * @param props - Properties to override the default values.
 * @returns A complete event.
 */
export function createEvent(
  props: WalkerOS.DeepPartialEvent = {},
): WalkerOS.Event {
  const timestamp = props.timestamp || new Date().setHours(0, 13, 37, 0);
  const group = props.group || 'gr0up';
  const count = props.count || 1;
  const id = `${timestamp}-${group}-${count}`;

  const defaultEvent: WalkerOS.Event = {
    name: 'entity action',
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
        entity: 'child',
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
      source: __VERSION__,
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
  if (props.name) {
    const [entity, action] = props.name.split(' ') ?? [];

    if (entity && action) {
      event.entity = entity;
      event.action = action;
    }
  }

  return event;
}

/**
 * Creates a complete event with default values based on the event name.
 * Used for testing and debugging.
 *
 * @param name - The name of the event to create.
 * @param props - Properties to override the default values.
 * @returns A complete event.
 */
export function getEvent(
  name: string = 'entity action',
  props: WalkerOS.DeepPartialEvent = {},
): WalkerOS.Event {
  const timestamp = props.timestamp || new Date().setHours(0, 13, 37, 0);

  const quantity = 2;
  const product1 = {
    data: {
      id: 'ers',
      name: 'Everyday Ruck Snack',
      color: 'black',
      size: 'l',
      price: 420,
    },
  };
  const product2 = {
    data: {
      id: 'cc',
      name: 'Cool Cap',
      size: 'one size',
      price: 42,
    },
  };

  const defaultEvents: Record<string, WalkerOS.PartialEvent> = {
    'cart view': {
      data: {
        currency: 'EUR',
        value: product1.data.price * quantity,
      },
      context: { shopping: ['cart', 0] },
      globals: { pagegroup: 'shop' },
      nested: [
        {
          entity: 'product',
          data: { ...product1.data, quantity },
          context: { shopping: ['cart', 0] },
          nested: [],
        },
      ],
      trigger: 'load',
    },
    'checkout view': {
      data: {
        step: 'payment',
        currency: 'EUR',
        value: product1.data.price + product2.data.price,
      },
      context: { shopping: ['checkout', 0] },
      globals: { pagegroup: 'shop' },
      nested: [
        {
          entity: 'product',
          ...product1,
          context: { shopping: ['checkout', 0] },
          nested: [],
        },
        {
          entity: 'product',
          ...product2,
          context: { shopping: ['checkout', 0] },
          nested: [],
        },
      ],
      trigger: 'load',
    },
    'order complete': {
      data: {
        id: '0rd3r1d',
        currency: 'EUR',
        shipping: 5.22,
        taxes: 73.76,
        total: 555,
      },
      context: { shopping: ['complete', 0] },
      globals: { pagegroup: 'shop' },
      nested: [
        {
          entity: 'product',
          ...product1,
          context: { shopping: ['complete', 0] },
          nested: [],
        },
        {
          entity: 'product',
          ...product2,
          context: { shopping: ['complete', 0] },
          nested: [],
        },
        {
          entity: 'gift',
          data: {
            name: 'Surprise',
          },
          context: { shopping: ['complete', 0] },
          nested: [],
        },
      ],
      trigger: 'load',
    },
    'page view': {
      data: {
        domain: 'www.example.com',
        title: 'walkerOS documentation',
        referrer: 'https://www.elbwalker.com/',
        search: '?foo=bar',
        hash: '#hash',
        id: '/docs/',
      },
      globals: { pagegroup: 'docs' },
      trigger: 'load',
    },
    'product add': {
      ...product1,
      context: { shopping: ['intent', 0] },
      globals: { pagegroup: 'shop' },
      nested: [],
      trigger: 'click',
    },
    'product view': {
      ...product1,
      context: { shopping: ['detail', 0] },
      globals: { pagegroup: 'shop' },
      nested: [],
      trigger: 'load',
    },
    'product visible': {
      data: { ...product1.data, position: 3, promo: true },
      context: { shopping: ['discover', 0] },
      globals: { pagegroup: 'shop' },
      nested: [],
      trigger: 'load',
    },
    'promotion visible': {
      data: {
        name: 'Setting up tracking easily',
        position: 'hero',
      },
      context: { ab_test: ['engagement', 0] },
      globals: { pagegroup: 'homepage' },
      trigger: 'visible',
    },
    'session start': {
      data: {
        id: 's3ss10n',
        start: timestamp,
        isNew: true,
        count: 1,
        runs: 1,
        isStart: true,
        storage: true,
        referrer: '',
        device: 'c00k13',
      },
      user: {
        id: 'us3r',
        device: 'c00k13',
        session: 's3ss10n',
        hash: 'h4sh',
        address: 'street number',
        email: 'user@example.com',
        phone: '+49 123 456 789',
        userAgent: 'Mozilla...',
        browser: 'Chrome',
        browserVersion: '90',
        deviceType: 'desktop',
        language: 'de-DE',
        country: 'DE',
        region: 'HH',
        city: 'Hamburg',
        zip: '20354',
        timezone: 'Berlin',
        os: 'walkerOS',
        osVersion: '1.0',
        screenSize: '1337x420',
        ip: '127.0.0.0',
        internal: true,
        custom: 'value',
      },
    },
  };

  return createEvent({ ...defaultEvents[name], ...props, name: name });
}
