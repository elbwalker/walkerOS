import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';

export interface InstallCommandProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'type' | 'children'
> {
  /** The command shown and copied. */
  command?: string;
}

type CopyState = 'idle' | 'done' | 'failed';

/** How long the check stays after a successful copy. */
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
 * A copy-to-clipboard chip for a CLI command. It confirms with a check only when
 * the copy succeeded, and says "Copy failed" otherwise. The button's accessible
 * name is the visible command, so speech input can target it; the action is its
 * description. The live region sits beside the button: a button's content is
 * presentational for assistive technology.
 */
export function InstallCommand({
  command = 'npm i -g @walkeros/cli',
  className,
  'aria-describedby': describedBy,
  ...rest
}: InstallCommandProps) {
  const hintId = useId();
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

  const copy = async (): Promise<void> => {
    const copied = await copyText(command);
    if (!mounted.current) return;
    clearTimeout(timer.current);
    setState(copied ? 'done' : 'failed');
    if (copied) timer.current = setTimeout(() => setState('idle'), CONFIRM_MS);
  };

  return (
    <>
      <button
        {...rest}
        aria-describedby={describedBy ? `${hintId} ${describedBy}` : hintId}
        type="button"
        className={cx('elb-cmd', className)}
        onClick={() => {
          void copy();
        }}
      >
        <span>
          <span className="elb-cmd__prompt" aria-hidden="true">
            ${' '}
          </span>
          {command}
        </span>
        <span
          className={cx(
            'elb-cmd__icon',
            state === 'done' && 'elb-cmd__icon--done',
          )}
        >
          <Icon name={state === 'done' ? 'check' : 'copy'} />
        </span>
      </button>
      <span id={hintId} hidden>
        Copy install command
      </span>
      <span className="elb-cmd__status" role="status">
        {state === 'done' ? 'Copied' : state === 'failed' ? 'Copy failed' : ''}
      </span>
    </>
  );
}
