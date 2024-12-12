import type { Mapping, WalkerOS } from '@elbwalker/types';
import { useEffect, useState, useRef, useCallback } from 'react';
import { debounce, isObject } from '@elbwalker/utils';
import CodeBox from './codeBox';

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
  height?: number;
  labelLeft?: string;
  labelMiddle?: string;
  labelRight?: string;
  showMiddle?: boolean;
}

const EventMapping: React.FC<EventMappingProps> = ({
  left: initLeft = {},
  middle: initMiddle = {},
  right: initRight = '',
  options = {},
  fn,
  fnName = 'push',
  height = 400,
  labelLeft = 'Event',
  labelMiddle = 'Custom Config',
  labelRight = 'Result',
  showMiddle = true,
}) => {
  const formatValue = (obj: unknown): string => {
    return typeof obj === 'string'
      ? obj // Return string as is
      : JSON.stringify(obj, null, 2).replace(/"([^"]+)":/g, '$1:'); // Remove quotes from keys
  };

  const [left, setLeft] = useState(formatValue(initLeft));
  const [middle, setMiddle] = useState(formatValue(initMiddle));
  const [right, setRight] = useState<string[]>([initRight]);

  const log = useCallback(
    (...args: unknown[]) => {
      const params = args.map((arg) => {
        return isObject(arg) ? formatValue(arg) : `"${arg}"`;
      });
      setRight([`${fnName}(${params.join(', ')})`]);
    },
    [fnName],
  );

  const parseInput = useCallback((code: string): unknown => {
    return Function('"use strict"; return (' + code + ')')();
  }, []);

  const updateRight = useRef(
    debounce(
      (leftStr: string, middleStr: string, options: WalkerOS.AnyObject) => {
        setRight([]);

        try {
          const parsedLeft = parseInput(leftStr);
          const parsedMiddle = parseInput(middleStr) as never;

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
  }, [left, middle, options, updateRight]);

  const boxHeightStyle = {
    height: `${height}px`,
  };
  const widthClass = showMiddle ? 'w-1/3' : 'w-1/2';

  return (
    <div className="my-4">
      <div className="flex gap-4" style={boxHeightStyle}>
        <CodeBox
          label={labelLeft}
          value={left}
          onChange={setLeft}
          widthClass={widthClass}
        />

        {showMiddle && (
          <CodeBox
            label={labelMiddle}
            value={middle}
            onChange={setMiddle}
            widthClass={widthClass}
          />
        )}

        <CodeBox
          label={labelRight}
          disabled={true}
          value={right[0] || 'No event yet.'}
          widthClass={widthClass}
        />
      </div>
    </div>
  );
};

export default EventMapping;
