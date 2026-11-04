// The selection guard: an in-place async selection holds the destination's
// guard while it awaits, so the pass that owns it resumes, releases and
// drains before any pass that waited on the guard.

import { FatalError } from '@walkeros/core';
import type { Destination } from '@walkeros/core';
import { startFlow } from '..';
import { createEvent } from '../handle';
import { selectRound, type SelectPass } from '../selection';

async function race(condition: () => Promise<boolean>) {
  const { collector } = await startFlow({
    destinations: {
      d: { code: { type: 'd', config: {}, push: async () => {} } },
    },
  });
  const pass: SelectPass = {
    collector,
    destination: collector.destinations.d,
    id: 'd',
    failed: new Set(),
    onFailed: () => {},
  };
  pass.destination.config.mapping = { order: { complete: { condition } } };
  const queued: Destination.Queued = {
    event: createEvent(collector, { name: 'order complete' }),
  };
  pass.destination.queuePush = [queued];
  const order: string[] = [];
  const run = async (name: string) => {
    const list = () => pass.destination.queuePush ?? [];
    for (
      let w = selectRound(pass, list, true);
      w;
      w = selectRound(pass, list, true)
    )
      await w;
    order.push(
      `${name}:${(pass.destination.queuePush ?? []).splice(0).length}`,
    );
  };
  // Handlers attach at once, so a rejection is never reported as unhandled.
  const settled = (p: Promise<void>) =>
    p.then(
      () => undefined,
      (err: unknown) => err,
    );
  return {
    order,
    owner: settled(run('owner')),
    waiter: settled(run('waiter')),
  };
}

it('the owner resumes and drains before any waiter', async () => {
  let release: (ok: boolean) => void = () => {};
  const { order, owner, waiter } = await race(
    () =>
      new Promise<boolean>((r) => {
        release = r;
      }),
  );
  release(true);
  await Promise.all([owner, waiter]);
  expect(order).toEqual(['owner:1', 'waiter:0']);
});

it('a FatalError releases the guard and keeps the queue', async () => {
  let calls = 0; // the owner's selection fails fatally, the waiter's succeeds
  const { order, owner, waiter } = await race(() =>
    calls++ === 0
      ? Promise.reject(new FatalError('stop'))
      : Promise.resolve(true),
  );
  expect(await owner).toBeInstanceOf(FatalError);
  expect(await waiter).toBeUndefined();
  expect(order).toEqual(['waiter:1']);
});
