import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../design/components/atoms/Icon';

/** How long the check stays after a successful copy. */
const CONFIRM_MS = 1400;

export interface CopyButtonProps {
  /** What is copied; nothing to copy disables the button. */
  text: string;
  label: string;
}

/** An icon button that copies `text` and confirms with a check. */
export function CopyButton({ text, label }: CopyButtonProps) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    clearTimeout(timer.current);
    setDone(true);
    timer.current = setTimeout(() => setDone(false), CONFIRM_MS);
  };

  return (
    <button
      type="button"
      className="elb-pg-copy"
      aria-label={done ? `${label}: copied` : label}
      disabled={!text}
      onClick={() => {
        void copy();
      }}
    >
      <Icon name={done ? 'check' : 'copy'} />
    </button>
  );
}
