import type { Mapping, WalkerOS } from '@elbwalker/types';
import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { debounce, isObject } from '@elbwalker/utils';
import CodeBox, { formatValue } from './codeBox';

interface EventMappingProps {
  left: WalkerOS.AnyObject;
  middle?: WalkerOS.AnyObject;
  right?: string;
  options?: WalkerOS.AnyObject;
  mapping?: Mapping.Config;
  fn: (
    left: unknown,
    middle: unknown,
    log: (...args: unknown[]) => void,
    options?: WalkerOS.AnyObject,
  ) => void;
  fnName?: string;
  labelLeft?: string;
  labelMiddle?: string;
  labelRight?: string;
  showMiddle?: boolean;
}

const EventMapping: React.FC<EventMappingProps> = memo(
  ({
    left: initLeft = {},
    middle: initMiddle = {},
    right: initRight = '',
    options,
    fn,
    fnName = 'push',
    labelLeft = 'Event',
    labelMiddle = 'Custom Config',
    labelRight = 'Result',
    showMiddle = true,
  }) => {
    const toString = (value: unknown) =>
      isObject(value) ? JSON.stringify(value) : String(value);
    const [left, setLeft] = useState(toString(initLeft));
    const [middle, setMiddle] = useState(toString(initMiddle));
    const [right, setRight] = useState<string[]>([initRight]);

    const log = useRef((...args: unknown[]) => {
      const params = args.map((arg) =>
        isObject(arg) ? formatValue(arg) : `"${arg}"`,
      );
      setRight([`${fnName}(${params.join(', ')})`]);
    }).current;

    const parseInput = useCallback((code: string): unknown => {
      return Function('"use strict"; return (' + code + ')')();
    }, []);

    const updateRight = useRef(
      debounce(
        (leftStr: string, middleStr: string, options: WalkerOS.AnyObject) => {
          setRight([]);

          try {
            const parsedLeft = parseInput(leftStr);
            const parsedMiddle = parseInput(middleStr);

            fn(parsedLeft, parsedMiddle, log, options);
          } catch (e) {
            setRight([`Preview error: ${String(e)}`]);
          }
        },
        500,
      ),
    ).current;

    useEffect(() => {
      updateRight(left, middle, options);
    }, [left, middle, options]);

    const boxClassNames = 'flex-1 resize max-h-96 xl:max-h-full';

    return (
      <div className="my-4">
        <div className={`flex flex-col xl:flex-row gap-2 text-sm scroll`}>
          <CodeBox
            label={labelLeft}
            value={left}
            onChange={setLeft}
            className={boxClassNames}
          />

          {showMiddle && (
            <CodeBox
              label={labelMiddle}
              value={middle}
              onChange={setMiddle}
              className={boxClassNames}
            />
          )}

          <CodeBox
            label={labelRight}
            disabled
            value={right[0] || 'No event yet.'}
            className={boxClassNames}
          />
        </div>
      </div>
    );
  },
);

export default EventMapping;
