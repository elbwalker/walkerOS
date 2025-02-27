import type { Mapping as WalkerOSMapping, WalkerOS } from '@elbwalker/types';
import { useEffect, useState, useRef, memo } from 'react';
import { debounce } from '@elbwalker/utils';
import CodeBox, { formatValue, parseInput } from '../molecules/codeBox';

interface MappingProps {
  left: string;
  middle?: string;
  right?: string;
  options?: WalkerOS.AnyObject;
  mapping?: WalkerOSMapping.Config;
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

const Mapping: React.FC<MappingProps> = memo(
  ({
    left: initLeft = '{}',
    middle: initMiddle = '{}',
    right: initRight = '',
    options,
    fn,
    fnName,
    labelLeft = 'Event',
    labelMiddle = 'Custom Config',
    labelRight = 'Result',
    showMiddle = true,
  }) => {
    const [left, setLeft] = useState(initLeft);
    const [middle, setMiddle] = useState(initMiddle);
    const [right, setRight] = useState<string[]>([initRight]);

    const log = useRef((...args: unknown[]) => {
      const params = args
        .map((arg) => formatValue(arg, { quotes: true }))
        .join(', ');

      setRight([fnName ? `${fnName}(${params})` : params]);
    }).current;

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
        true,
      ),
    ).current;

    useEffect(() => {
      updateRight(left, middle, options);
    }, [left, middle, options]);

    const boxClassNames = 'flex-1 resize max-h-96 xl:max-h-full flex flex-col';

    return (
      <div className="my-4">
        <div className={`flex flex-col xl:flex-row gap-2 scroll`}>
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

export default Mapping;
