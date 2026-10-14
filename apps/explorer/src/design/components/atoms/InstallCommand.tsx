import React, { useId, type ButtonHTMLAttributes } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import { useCopy } from './useCopy';

export interface InstallCommandProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'type' | 'children'
> {
  /** The command shown and copied. */
  command?: string;
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
  const [state, copy] = useCopy();

  return (
    <>
      <button
        {...rest}
        aria-describedby={describedBy ? `${hintId} ${describedBy}` : hintId}
        type="button"
        className={cx('elb-cmd', className)}
        onClick={() => copy(command)}
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
