import type { Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { dataLayerDestination } from '../destination';

// Driven through a real collector, so the push is what a page gets.

const dataLayer = (): unknown[] => {
  const value: unknown = Reflect.get(window, 'dataLayer');
  return Array.isArray(value) ? value : [];
};
const lastPush = (): unknown => dataLayer()[dataLayer().length - 1];

beforeEach(() => {
  Reflect.deleteProperty(window, 'dataLayer');
});

it('pushes the full event plus event and _clear', async () => {
  const { elb } = await startFlow({
    destinations: { dataLayer: { code: dataLayerDestination() } },
  });
  await elb('product view', { name: 'Cotton Tee', price: 25 });
  expect(lastPush()).toMatchObject({
    event: 'product view',
    name: 'product view',
    entity: 'product',
    action: 'view',
    data: { name: 'Cotton Tee', price: 25 },
    _clear: true,
  });
});

it('keeps an existing dataLayer array (GTM may own it)', async () => {
  const existing: unknown[] = [{ gtm: 'start' }];
  Reflect.set(window, 'dataLayer', existing);
  const { elb } = await startFlow({
    destinations: { dataLayer: { code: dataLayerDestination() } },
  });
  await elb('product view', { name: 'Cotton Tee' });
  expect(Reflect.get(window, 'dataLayer')).toBe(existing);
  expect(existing).toHaveLength(2);
});

it('pushes a fresh object, not the collector event reference', async () => {
  const seen: WalkerOS.Event[] = [];
  const spy: Destination.Instance = {
    type: 'spy',
    config: {},
    push: (event) => {
      seen.push(event);
    },
  };
  const { elb } = await startFlow({
    destinations: {
      dataLayer: { code: dataLayerDestination() },
      spy: { code: spy },
    },
  });
  await elb('product view', { name: 'Cotton Tee' });
  expect(lastPush()).not.toBe(seen[seen.length - 1]);
});

it('omits user and consent while they are empty (D1)', async () => {
  const { elb } = await startFlow({
    destinations: { dataLayer: { code: dataLayerDestination() } },
  });
  await elb('product view', { name: 'Cotton Tee' });
  const last = lastPush();
  expect(last).not.toHaveProperty('user'); // window mode, no walker user set
  expect(last).not.toHaveProperty('consent');
});

it('pushes empty data, context, custom and globals, so _clear wipes the last values', async () => {
  const { elb } = await startFlow({
    destinations: { dataLayer: { code: dataLayerDestination() } },
  });
  await elb('order complete');
  expect(lastPush()).toMatchObject({
    data: {},
    context: {},
    custom: {},
    globals: {},
  });
});

it('pushes user once it has content', async () => {
  const { elb } = await startFlow({
    destinations: { dataLayer: { code: dataLayerDestination() } },
  });
  await elb('walker user', { id: 'u1' });
  await elb('product view', { name: 'Cotton Tee' });
  expect(lastPush()).toMatchObject({ user: { id: 'u1' } });
});

it('has no pushBatch', () => {
  expect(dataLayerDestination().pushBatch).toBeUndefined();
});
