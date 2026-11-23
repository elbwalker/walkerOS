import React, { type HTMLAttributes } from 'react';
import { Icon } from '../atoms/Icon';
import { cx } from '../cx';

export type TerminalStatus = 'success' | 'warning' | 'danger' | 'info';

/** One line on screen: a command after its prompt, its output, or a status with its icon and word. */
export interface TerminalLine {
  kind: 'command' | 'output' | 'status';
  text: string;
  /** A status line's status; `info` when left out. */
  status?: TerminalStatus;
}

export interface TerminalProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  /** Shown in the bar. */
  title?: string;
  lines: readonly TerminalLine[];
  /** A caret after the last line. */
  caret?: boolean;
}

const STATUS_WORDS: Readonly<Record<TerminalStatus, string>> = {
  success: 'Success',
  warning: 'Warning',
  danger: 'Error',
  info: 'Info',
};

function Content({ line }: { line: TerminalLine }) {
  if (line.kind === 'command')
    return (
      <>
        <span className="elb-terminal__prompt" aria-hidden="true">
          $
        </span>{' '}
        {line.text}
      </>
    );
  if (line.kind === 'output') return <>{line.text}</>;
  const status = line.status ?? 'info';
  return (
    <>
      <Icon name={status} size={14} className="elb-terminal__icon" />
      <span className="elb-terminal__word">{STATUS_WORDS[status]}</span>{' '}
      {line.text}
    </>
  );
}

const Caret = () => <span className="elb-terminal__caret" aria-hidden="true" />;

/** A terminal window: commands, their output and status lines, on a dark island in both themes. */
export function Terminal({
  title,
  lines,
  caret = false,
  className,
  ...rest
}: TerminalProps) {
  return (
    <div {...rest} data-theme="dark" className={cx('elb-terminal', className)}>
      <div className="elb-terminal__bar">
        <span className="elb-terminal__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {title !== undefined && (
          <span className="elb-terminal__title">{title}</span>
        )}
      </div>
      <div className="elb-terminal__body">
        {lines.map((line, index) => (
          <div
            key={index}
            className={cx(
              'elb-terminal__line',
              `elb-terminal__line--${line.kind}`,
              line.kind === 'status' &&
                `elb-terminal__line--${line.status ?? 'info'}`,
            )}
          >
            <Content line={line} />
            {caret && index === lines.length - 1 && <Caret />}
          </div>
        ))}
        {caret && lines.length === 0 && (
          <div className="elb-terminal__line">
            <Caret />
          </div>
        )}
      </div>
    </div>
  );
}
