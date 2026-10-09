import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { cx } from '../../../design/components/cx';
import { renderTokens, tokenize, type CodeKind } from './highlight';

export interface CodeEditorHandle {
  /** Scroll so that a line sits near the top of the editor. */
  scrollToLine: (line: number) => void;
}

export interface CodeEditorProps {
  value: string;
  kind: CodeKind;
  label: string;
  /** Without it the editor is read-only. */
  onChange?: (value: string) => void;
  /** First and last line to mark, inclusive. */
  highlight?: [number, number];
  className?: string;
}

/**
 * A plain textarea laid over its own syntax-highlighted copy. The textarea
 * owns typing, selection and scrolling; the copy below follows its scroll.
 */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    { value, kind, label, onChange, highlight, className },
    ref,
  ) {
    const areaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);

    const follow = () => {
      const area = areaRef.current;
      const pre = preRef.current;
      if (!area || !pre) return;
      pre.scrollTop = area.scrollTop;
      pre.scrollLeft = area.scrollLeft;
    };

    useImperativeHandle(ref, () => ({
      scrollToLine(line) {
        const area = areaRef.current;
        const row = preRef.current?.children[line];
        if (!area || !(row instanceof HTMLElement)) return;
        area.scrollTop = Math.max(0, row.offsetTop - 24);
        follow();
      },
    }));

    return (
      <div className={cx('elb-pg-editor', className)}>
        <pre ref={preRef} aria-hidden="true">
          {value.split('\n').map((line, index) => (
            <div
              key={index}
              className={cx(
                highlight &&
                  index >= highlight[0] &&
                  index <= highlight[1] &&
                  'elb-pg-editor__on',
              )}
            >
              {line ? renderTokens(tokenize(line, kind)) : ' '}
            </div>
          ))}
        </pre>
        <textarea
          ref={areaRef}
          value={value}
          readOnly={!onChange}
          aria-label={label}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          onChange={(event) => onChange?.(event.target.value)}
          onScroll={follow}
        />
      </div>
    );
  },
);
