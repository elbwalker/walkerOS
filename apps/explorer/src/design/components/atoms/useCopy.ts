import { useEffect, useRef, useState } from 'react';

export type CopyState = 'idle' | 'done' | 'failed';

/** How long `done` stays after a successful copy. */
const CONFIRM_MS = 1400;

/**
 * True only when the clipboard took the text. A missing clipboard API (http,
 * older browsers) throws on access, which counts as a failure like a rejection.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies a text to the clipboard and says how it went: `done` for 1.4 s after
 * the clipboard took it, `failed` until the next try.
 */
export function useCopy(): readonly [CopyState, (text: string) => void] {
  const [state, setState] = useState<CopyState>('idle');
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const copy = async (text: string): Promise<void> => {
    const copied = await copyText(text);
    if (!mounted.current) return;
    clearTimeout(timer.current);
    setState(copied ? 'done' : 'failed');
    if (copied) timer.current = setTimeout(() => setState('idle'), CONFIRM_MS);
  };

  return [
    state,
    (text) => {
      void copy(text);
    },
  ];
}
