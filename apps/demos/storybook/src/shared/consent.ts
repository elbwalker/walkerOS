import { useEffect, useRef, useState } from 'react';
import type { Elb, WalkerOS } from '@walkeros/core';
import { notRunning } from './controls';

export type ConsentState = 'unknown' | 'accepted' | 'denied';

/** What the consent bar shows and calls. */
export interface DemoConsent {
  state: ConsentState;
  /** A problem with the last choice, such as consent that was not sent. */
  notice?: string;
  onAccept(): void;
  onDeny(): void;
  onReset(): void;
}

export interface DemoConsentOptions {
  /**
   * Remembers the choice and the device id in `localStorage` and applies a
   * remembered choice again on mount, as a CMP does. For the demo site; the
   * stories keep both in story state.
   */
  persist?: boolean;
}

const stateKey = 'consentState';
// Not `elbDeviceId`: that key belongs to the session source.
const deviceKey = 'demoDeviceId';

// Storage can be missing or blocked (private mode, blocked site data); the
// demo then works without remembering.
function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not remembered; the choice still applies.
  }
}

function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to forget.
  }
}

function storedState(): ConsentState {
  const value = readStored(stateKey);
  return value === 'accepted' || value === 'denied' ? value : 'unknown';
}

// The persona owns `user.id`; consent only ever touches `user.device`.
// A choice that a later one replaced while its first command was on the way
// stops there (`isCurrent`): the later choice's commands stand.
async function sendAccept(
  elb: WalkerOS.Elb,
  device: string,
  isCurrent: () => boolean,
): Promise<Elb.PushResult[]> {
  const results = [await elb('walker user', { device })];
  if (isCurrent())
    results.push(
      await elb('walker consent', { functional: true, marketing: true }),
    );
  return results;
}

async function sendDeny(
  elb: WalkerOS.Elb,
  isCurrent: () => boolean,
): Promise<Elb.PushResult[]> {
  const results = [
    await elb('walker consent', { functional: true, marketing: false }),
  ];
  if (isCurrent())
    results.push(await elb('walker user', { device: undefined }));
  return results;
}

/**
 * The demo CMP behind the consent bar. Accept sends `walker user` with a short
 * random device id (made once, reused after) and `walker consent` with
 * marketing; Deny sends `walker consent` without marketing and removes the
 * device; Reset forgets the choice and sends nothing. A send that does not
 * reach walkerOS shows as the notice.
 */
export function useDemoConsent(
  getElb: () => WalkerOS.Elb | undefined,
  options: DemoConsentOptions = {},
): DemoConsent {
  const persist = options.persist ?? false;
  const [state, setState] = useState<ConsentState>(() =>
    persist ? storedState() : 'unknown',
  );
  const [notice, setNotice] = useState<string>();
  const deviceRef = useRef<string | undefined>(undefined);
  // Only the latest choice may report: an earlier send that settles late
  // must not overwrite the notice of a later one.
  const attemptRef = useRef(0);
  const appliedRef = useRef(false);

  const device = (): string => {
    if (!deviceRef.current) {
      deviceRef.current =
        (persist ? readStored(deviceKey) : null) ??
        Math.random().toString(36).slice(2, 7);
      if (persist) writeStored(deviceKey, deviceRef.current);
    }
    return deviceRef.current;
  };

  const send = (granted: boolean) => {
    const attempt = ++attemptRef.current;
    const elb = getElb();
    if (!elb) {
      setNotice(`Not sent: ${notRunning}`);
      return;
    }
    setNotice(undefined);

    const isCurrent = () => attempt === attemptRef.current;
    (granted ? sendAccept(elb, device(), isCurrent) : sendDeny(elb, isCurrent))
      .then((results) => {
        if (!isCurrent()) return;
        const failed = results.find((result) => !result.ok);
        if (failed)
          setNotice(
            `Not sent: ${failed.error ?? 'walkerOS rejected the command.'}`,
          );
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return;
        setNotice(
          `Not sent: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  };

  const choose = (granted: boolean) => {
    const next = granted ? 'accepted' : 'denied';
    setState(next);
    if (persist) writeStored(stateKey, next);
    send(granted);
  };

  // A remembered choice applies again once, on mount (only with persist can
  // the first state be other than unknown).
  useEffect(() => {
    if (appliedRef.current) return;
    appliedRef.current = true;
    if (state !== 'unknown') send(state === 'accepted');
    // Mount only: later choices send from their own callbacks.
  }, []);

  return {
    state,
    notice,
    onAccept: () => choose(true),
    onDeny: () => choose(false),
    onReset: () => {
      attemptRef.current += 1;
      setState('unknown');
      setNotice(undefined);
      if (persist) removeStored(stateKey);
    },
  };
}
