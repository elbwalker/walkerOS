import type { WalkerOS } from './types';
import { assign } from './assign';
import { fnv1a64 } from './deriveSpanId';
import { getSpanId } from './getSpanId';

/**
 * Fixed timestamp of every generated event (2023-11-14T22:13:20Z, in
 * milliseconds), so generated events are the same on every run and day.
 */
const TIMESTAMP = 1700000000000;

/**
 * Names `getEvent` knows: the standard events plus the generic default
 * `entity action`. Any other name does not compile.
 */
export type StandardEventName =
  | 'entity action'
  | 'cart view'
  | 'checkout start'
  | 'order complete'
  | 'page view'
  | 'product add'
  | 'product view'
  | 'product visible'
  | 'promotion visible'
  | 'session start';

/**
 * Creates a complete event with default values.
 * Used for testing and debugging.
 *
 * Models a post-collector event: `source` always carries the run-stamped
 * `count` and `trace`, so a generated event matches one that has been pushed
 * through the collector. Override via `props.source` if needed.
 *
 * @param props - Properties to override the default values.
 * @returns A complete event.
 */
export function createEvent(
  props: WalkerOS.DeepPartialEvent = {},
): WalkerOS.Event {
  const timestamp = props.timestamp || TIMESTAMP;
  const id = props.id || getSpanId();

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
      },
    ],
    consent: { functional: true },
    id,
    trigger: 'test',
    entity: 'entity',
    action: 'action',
    timestamp,
    timing: 3.14,
    source: {
      type: 'collector',
      schema: '4',
    },
  };

  // Note: Always prefer the props over the defaults

  // Merge properties
  const event = assign(defaultEvent, props, { merge: false });

  // Mirror collector output: generated events always carry the run-stamped
  // source fields (per-run count and a fixed, deterministic trace) so an event
  // built from this helper matches a pushed event without tests having to
  // assert them, and two generator calls produce equal events. Any source
  // fields provided via props still win.
  event.source = {
    count: 1,
    trace: '0a1b2c3d4e5f60718293a4b5c6d7e8f9',
    ...event.source,
  };

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
 * Creates a complete standard event with default values based on its name.
 * Used for testing and debugging.
 *
 * The output is stable: the timestamp is fixed and the id is derived from the
 * name (16 lowercase hex characters), so the same name gives the same event on
 * every call, run and day. Events with other names use `createEvent`.
 *
 * @param name - The standard event to create.
 * @param props - Properties to override the default values.
 * @returns A complete event.
 */
export function getEvent(
  name: StandardEventName = 'entity action',
  props: WalkerOS.DeepPartialEvent = {},
): WalkerOS.Event {
  const timestamp = props.timestamp || TIMESTAMP;
  const id = props.id || fnv1a64(name);

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

  const defaultEvents: Record<StandardEventName, WalkerOS.PartialEvent> = {
    'entity action': {},
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
    'checkout start': {
      data: {
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
        value: product1.data.price + product2.data.price,
        tax: 73.76,
        shipping: 5.22,
        total: 467.22,
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
        referrer: 'https://www.walkeros.io/',
        search: '?foo=bar',
        hash: '#hash',
        id: '/docs/',
      },
      globals: { pagegroup: 'docs' },
      trigger: 'load',
    },
    'product add': {
      data: { ...product1.data, quantity: 1, currency: 'EUR' },
      context: { shopping: ['intent', 0] },
      globals: { pagegroup: 'shop' },
      nested: [],
      trigger: 'click',
    },
    'product view': {
      data: { ...product1.data, currency: 'EUR' },
      context: { shopping: ['detail', 0] },
      globals: { pagegroup: 'shop' },
      nested: [],
      trigger: 'load',
    },
    'product visible': {
      data: {
        ...product1.data,
        position: 3,
        list: 'Related products',
        promo: true,
      },
      context: { shopping: ['discover', 0] },
      globals: { pagegroup: 'shop' },
      nested: [],
      trigger: 'load',
    },
    'promotion visible': {
      data: {
        id: 'promo_autumn26',
        name: 'Setting up tracking easily',
        slot: 'hero',
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

  return createEvent({ ...defaultEvents[name], ...props, name, id });
}
