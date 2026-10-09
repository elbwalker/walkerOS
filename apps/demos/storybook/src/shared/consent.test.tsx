import { act, renderHook } from '@testing-library/react';
import type { Elb, WalkerOS } from '@walkeros/core';
import { useDemoConsent } from './consent';

// A fake elb that records every call. It stands in for the page's elb (a
// queue or the browser source's push); nothing is delivered and no delivery
// is claimed, these tests check which commands the consent bar sends.
function fakeElb(
  answer: () => Elb.PushResult | Promise<Elb.PushResult> = () => ({
    ok: true,
  }),
) {
  const calls: unknown[][] = [];
  const elb: WalkerOS.Elb = async (...args: unknown[]) => {
    calls.push(args);
    return answer();
  };
  return { elb, calls };
}

// Lets every pending send settle (the hook uses no timers).
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const accepted = ['walker consent', { functional: true, marketing: true }];
const denied = ['walker consent', { functional: true, marketing: false }];

beforeEach(() => {
  jest.useRealTimers();
  localStorage.clear();
});

test('Accept sends the device, then the consent; a second Accept reuses the device', async () => {
  jest.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.2);
  const { elb, calls } = fakeElb();
  const { result } = renderHook(() => useDemoConsent(() => elb));

  act(() => result.current.onAccept());
  await settle();

  expect(result.current.state).toBe('accepted');
  expect(result.current.notice).toBeUndefined();
  expect(calls).toHaveLength(2);
  const [userCall, consentCall] = calls;
  expect(userCall[0]).toBe('walker user');
  expect(userCall[1]).toStrictEqual({
    device: expect.stringMatching(/^[0-9a-z]{5}$/),
  });
  expect(consentCall).toStrictEqual(accepted);

  act(() => result.current.onAccept());
  await settle();
  expect(calls[2]).toStrictEqual(userCall);
  expect(calls[3]).toStrictEqual(accepted);
});

test('Deny sends the consent, then removes the device', async () => {
  const { elb, calls } = fakeElb();
  const { result } = renderHook(() => useDemoConsent(() => elb));

  act(() => result.current.onDeny());
  await settle();

  expect(result.current.state).toBe('denied');
  expect(calls).toStrictEqual([denied, ['walker user', { device: undefined }]]);
});

test('no consent command carries a user id or a session', async () => {
  const { elb, calls } = fakeElb();
  const { result } = renderHook(() => useDemoConsent(() => elb));

  act(() => result.current.onAccept());
  await settle();
  act(() => result.current.onDeny());
  await settle();
  act(() => result.current.onAccept());
  await settle();

  expect(calls).toHaveLength(6);
  for (const [command, data] of calls) {
    if (command !== 'walker user') continue;
    expect(
      typeof data === 'object' && data !== null && Object.keys(data),
    ).toEqual(['device']);
  }
});

test('Reset forgets the choice and sends nothing', async () => {
  const { elb, calls } = fakeElb();
  const { result } = renderHook(() => useDemoConsent(() => elb));

  act(() => result.current.onAccept());
  await settle();
  act(() => result.current.onReset());
  await settle();

  expect(result.current.state).toBe('unknown');
  expect(result.current.notice).toBeUndefined();
  expect(calls).toHaveLength(2);
});

test('without a running walkerOS the choice shows, with a notice', () => {
  const { result } = renderHook(() => useDemoConsent(() => undefined));

  act(() => result.current.onAccept());

  expect(result.current.state).toBe('accepted');
  expect(result.current.notice).toBe('Not sent: walkerOS is not running.');
});

test('a failed send shows its error', async () => {
  const { elb } = fakeElb(() => ({ ok: false, error: 'consent rejected' }));
  const { result } = renderHook(() => useDemoConsent(() => elb));

  act(() => result.current.onDeny());
  await settle();

  expect(result.current.state).toBe('denied');
  expect(result.current.notice).toBe('Not sent: consent rejected');
});

test('a send that throws shows its message', async () => {
  const { elb } = fakeElb(() => Promise.reject(new Error('queue closed')));
  const { result } = renderHook(() => useDemoConsent(() => elb));

  act(() => result.current.onAccept());
  await settle();

  expect(result.current.notice).toBe('Not sent: queue closed');
});

test('an earlier send that settles late never overwrites a later choice', async () => {
  let release: (result: Elb.PushResult) => void = () => {};
  const late = new Promise<Elb.PushResult>((resolve) => {
    release = resolve;
  });
  const answers: Array<Promise<Elb.PushResult>> = [late];
  const { elb, calls } = fakeElb(() => answers.shift() ?? { ok: true });
  const { result } = renderHook(() => useDemoConsent(() => elb));

  act(() => result.current.onAccept()); // its first send waits
  act(() => result.current.onDeny());
  await settle();
  release({ ok: false, error: 'too late' });
  await settle();

  expect(result.current.state).toBe('denied');
  expect(result.current.notice).toBeUndefined();
  // The replaced Accept stops after its first command: Deny's stand last.
  expect(calls).toHaveLength(3);
  expect(calls.at(-1)).toStrictEqual(['walker user', { device: undefined }]);
});

test('a Reset stops a choice still on its way', async () => {
  let release: (result: Elb.PushResult) => void = () => {};
  const late = new Promise<Elb.PushResult>((resolve) => {
    release = resolve;
  });
  const answers: Array<Promise<Elb.PushResult>> = [late];
  const { elb, calls } = fakeElb(() => answers.shift() ?? { ok: true });
  const { result } = renderHook(() => useDemoConsent(() => elb));

  act(() => result.current.onAccept());
  act(() => result.current.onReset());
  release({ ok: true });
  await settle();

  expect(result.current.state).toBe('unknown');
  expect(calls).toHaveLength(1);
});

describe('persist', () => {
  test('stores the choice and the device id', async () => {
    const { elb, calls } = fakeElb();
    const { result } = renderHook(() =>
      useDemoConsent(() => elb, { persist: true }),
    );

    act(() => result.current.onAccept());
    await settle();

    expect(localStorage.getItem('consentState')).toBe('accepted');
    expect(calls[0]).toStrictEqual([
      'walker user',
      { device: localStorage.getItem('demoDeviceId') },
    ]);
  });

  test('re-applies a stored acceptance on mount with the stored device', async () => {
    localStorage.setItem('consentState', 'accepted');
    localStorage.setItem('demoDeviceId', 'abcde');
    const { elb, calls } = fakeElb();
    const { result } = renderHook(() =>
      useDemoConsent(() => elb, { persist: true }),
    );
    await settle();

    expect(result.current.state).toBe('accepted');
    expect(calls).toStrictEqual([
      ['walker user', { device: 'abcde' }],
      accepted,
    ]);
  });

  test('re-applies a stored denial on mount', async () => {
    localStorage.setItem('consentState', 'denied');
    const { elb, calls } = fakeElb();
    const { result } = renderHook(() =>
      useDemoConsent(() => elb, { persist: true }),
    );
    await settle();

    expect(result.current.state).toBe('denied');
    expect(calls).toStrictEqual([
      denied,
      ['walker user', { device: undefined }],
    ]);
  });

  test('Reset removes the choice and keeps the device id', async () => {
    const { elb } = fakeElb();
    const { result } = renderHook(() =>
      useDemoConsent(() => elb, { persist: true }),
    );

    act(() => result.current.onAccept());
    await settle();
    const device = localStorage.getItem('demoDeviceId');
    act(() => result.current.onReset());

    expect(localStorage.getItem('consentState')).toBeNull();
    expect(localStorage.getItem('demoDeviceId')).toBe(device);
  });

  test('works when storage is blocked', async () => {
    const blocked = () => {
      throw new Error('storage blocked');
    };
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    const { elb, calls } = fakeElb();
    const { result } = renderHook(() =>
      useDemoConsent(() => elb, { persist: true }),
    );

    act(() => result.current.onAccept());
    await settle();

    expect(result.current.state).toBe('accepted');
    expect(calls).toHaveLength(2);
  });

  test('without persist nothing is stored', async () => {
    const { elb } = fakeElb();
    const { result } = renderHook(() => useDemoConsent(() => elb));

    act(() => result.current.onAccept());
    await settle();

    expect(localStorage.length).toBe(0);
  });
});
