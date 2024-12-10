import type { Mapping, WalkerOS } from '@elbwalker/types';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createEvent, debounce, isObject } from '@elbwalker/utils';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';
import CodeBox from './codeBox';

// @TODO
// separate config and mapping
// one init part at the beginning and use it as config and configure the mapping here

interface EventMappingProps {
  left: WalkerOS.AnyObject;
  middle?: WalkerOS.AnyObject;
  right?: string;
  mapping?: Mapping.Config;
  fnName?: string;
  height?: number;
  labelLeft?: string;
  labelMiddle?: string;
  labelRight?: string;
}

const EventMapping: React.FC<EventMappingProps> = ({
  left: initLeft = {},
  middle: initMiddle = {},
  right: initRight = '',
  fnName = 'push',
  height = 400,
  labelLeft = 'Event',
  labelMiddle = 'Config',
  labelRight = 'Result',
}) => {
  const [left, setLeft] = useState(JSON.stringify(initLeft, null, 2));
  const [middle, setMiddle] = useState(JSON.stringify(initMiddle, null, 2));
  const [right, setRight] = useState<string[]>([initRight]);

  const fn = useCallback(
    (...args: unknown[]) => {
      const params = args.map((arg) => {
        return isObject(arg) ? JSON.stringify(arg, null, 2) : `"${arg}"`;
      });
      setRight([`${fnName}(${params.join(', ')})`]);
    },
    [fnName],
  );

  const parseJavaScriptObject = (code: string): unknown => {
    return Function('"use strict"; return (' + code + ')')();
  };

  const consoleLogRef = useRef(
    debounce((eventStr: string, customStr: string) => {
      setRight([]);

      try {
        const parsedEvent = createEvent(parseJavaScriptObject(eventStr));
        const parsedCustom = parseJavaScriptObject(customStr) as never;

        destinationGoogleGA4.push(parsedEvent, {
          custom: parsedCustom,
          init: true,
          fn,
        });
      } catch (e) {
        const errorMsg = `Preview error: ${String(e)}`;
        setRight([errorMsg]);
      }
    }, 500),
  ).current;

  useEffect(() => {
    consoleLogRef(left, middle);
  }, [left, middle, consoleLogRef]);

  const boxHeightStyle = {
    height: `${height}px`,
  };

  return (
    <div className="my-4">
      <div className="flex gap-4" style={boxHeightStyle}>
        <CodeBox label={labelLeft} value={left} onChange={setLeft} />

        <CodeBox label={labelMiddle} value={middle} onChange={setMiddle} />

        <CodeBox label={labelRight} disabled={true} value={right[0]} />
      </div>
    </div>
  );
};

export default EventMapping;
