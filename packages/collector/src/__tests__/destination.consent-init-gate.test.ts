import type { On } from '@walkeros/core';
import { startFlow } from '../flow';
import { destinationInit } from '../destination';

/**
 * Consent is the sole gate (Option A): a destination must perform NO observable
 * action (init, on-delivery, push) until its required consent is granted. These
 * tests pin that invariant across every path that can reach `destinationInit`,
 * including the `queueOn`-only path that a denied consent command drives via the
 * eventless `pushToDestinations` after every state command.
 *
 * A destination that declares an `on` handler is the trigger: a consent command
 * is buffered to its `queueOn` while it is not yet initialized, and the eventless
 * `pushToDestinations` would otherwise init it to flush that buffer.
 */
function gatedDestination(spies: {
  init: jest.Mock;
  push?: jest.Mock;
  on?: jest.Mock;
}) {
  return {
    code: {
      type: 'gtag',
      config: { consent: { marketing: true } },
      init: spies.init,
      push: spies.push ?? jest.fn(),
      on: spies.on ?? jest.fn(),
    },
  };
}

describe('destination consent init gate (sole-gate invariant)', () => {
  test('denied consent never initializes a consent-gated destination', async () => {
    const init = jest.fn();
    const { collector } = await startFlow({
      run: true,
      destinations: { gtag: gatedDestination({ init }) },
    });

    await collector.command('consent', { marketing: false });

    expect(init).not.toHaveBeenCalled();
    expect(collector.destinations.gtag.config.init).toBeFalsy();
  });

  test('grant self-heals: denied then granted initializes exactly once', async () => {
    const init = jest.fn();
    const { collector } = await startFlow({
      run: true,
      destinations: { gtag: gatedDestination({ init }) },
    });

    await collector.command('consent', { marketing: false });
    expect(init).not.toHaveBeenCalled();

    await collector.command('consent', { marketing: true });
    expect(init).toHaveBeenCalledTimes(1);

    // Idempotent: a repeat grant must not re-init.
    await collector.command('consent', { marketing: true });
    expect(init).toHaveBeenCalledTimes(1);
  });

  test('revocation after grant does not re-init and pushes nothing', async () => {
    const init = jest.fn();
    const push = jest.fn();
    const on = jest.fn();
    const { collector } = await startFlow({
      run: true,
      destinations: { gtag: gatedDestination({ init, push, on }) },
    });

    await collector.command('consent', { marketing: true });
    expect(init).toHaveBeenCalledTimes(1);
    on.mockClear();

    await collector.command('consent', { marketing: false });

    expect(init).toHaveBeenCalledTimes(1); // no re-init
    expect(on).toHaveBeenCalledWith('consent', expect.any(Object)); // revoke delivered to live dest
    expect(push).not.toHaveBeenCalled(); // no event pushed
  });

  test('event-level consent override initializes under collector-denied consent', async () => {
    const init = jest.fn();
    const push = jest.fn();
    const { elb } = await startFlow({
      run: true,
      consent: { marketing: false },
      destinations: { gtag: gatedDestination({ init, push }) },
    });

    // The event carries its own granted consent; per-event override is valid.
    await elb({ name: 'page view', data: {}, consent: { marketing: true } });

    expect(init).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('destination without a consent requirement is unaffected', async () => {
    const init = jest.fn();
    const push = jest.fn();
    const { elb } = await startFlow({
      run: true,
      consent: { marketing: false },
      destinations: {
        plain: { code: { type: 'plain', config: {}, init, push } },
      },
    });

    await elb({ name: 'page view', data: {} });

    expect(init).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
  });

  test('eventless run barrier does not init a denied consent-gated destination', async () => {
    const init = jest.fn();
    const { collector } = await startFlow({
      run: false,
      destinations: { gtag: gatedDestination({ init }) },
    });

    await collector.command('consent', { marketing: false });
    await collector.command('run');

    expect(init).not.toHaveBeenCalled();
  });

  test('destinationInit is fail-closed: refuses a consent-gated destination without an allow token', async () => {
    const init = jest.fn();
    const { collector } = await startFlow({
      run: true,
      destinations: { gtag: gatedDestination({ init }) },
    });
    const destination = collector.destinations.gtag;

    // Calling the chokepoint WITHOUT an affirmative allow decision must not init.
    const result = await destinationInit(collector, destination, 'gtag');

    expect(result).toBe(false);
    expect(init).not.toHaveBeenCalled();
    expect(destination.config.init).toBeFalsy();
  });

  test('on() deliveries stay buffered under denial and flush on grant', async () => {
    const init = jest.fn();
    const on = jest.fn();
    const { collector } = await startFlow({
      run: true,
      destinations: { gtag: gatedDestination({ init, on }) },
    });

    await collector.command('consent', { marketing: false });
    // The "receive an on" half of the invariant: under denial the handler must
    // not be invoked; the consent delivery stays buffered in queueOn.
    expect(on).not.toHaveBeenCalled();

    await collector.command('consent', { marketing: true });
    expect(init).toHaveBeenCalledTimes(1);
    // On grant the destination inits and the buffered deliveries flush to it.
    expect(on).toHaveBeenCalledWith('consent', expect.any(Object));
  });

  test('addDestination activation does not init a consent-gated destination under denial', async () => {
    const init = jest.fn();
    const { collector } = await startFlow({ run: true });

    await collector.command('consent', { marketing: false });
    await collector.command('destination', {
      code: {
        type: 'gtag',
        config: { consent: { marketing: true } },
        init,
        push: jest.fn(),
        on: jest.fn(),
      },
    });

    expect(init).not.toHaveBeenCalled();
  });
});
