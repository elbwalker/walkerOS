import type { WalkerOS } from '@elbwalker/types';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createEvent, debounce, isObject } from '@elbwalker/utils';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';
import CodeBox from './codeBox';

// @TODO
// separate config and mapping
// one init part at the beginning and use it as config and configure the mapping here

interface MappingProps {
  event?: WalkerOS.AnyObject;
  custom?: WalkerOS.AnyObject;
  height?: number;
}

const Mapping: React.FC<MappingProps> = ({
  event: initEvent = {},
  custom: initCustom = {},
  height = 400,
}) => {
  const [event, setEvent] = useState(JSON.stringify(initEvent, null, 2));
  const [custom, setCustom] = useState(JSON.stringify(initCustom, null, 2));
  const [logs, setLogs] = useState<string[]>([]);

  // @TODO make gtag function configurable
  const gtagFn = useCallback((...args: unknown[]) => {
    const params = args.map((arg) => {
      return isObject(arg) ? JSON.stringify(arg, null, 2) : `"${arg}"`;
    });
    setLogs([`gtag(${params.join(', ')})`]);
  }, []);

  const parseJavaScriptObject = (code: string): unknown => {
    return Function('"use strict"; return (' + code + ')')();
  };

  const consoleLogRef = useRef(
    debounce((eventStr: string, customStr: string) => {
      setLogs([]);

      try {
        const parsedEvent = createEvent(parseJavaScriptObject(eventStr));
        const parsedCustom = parseJavaScriptObject(customStr) as never;

        destinationGoogleGA4.push(parsedEvent, {
          custom: parsedCustom,
          init: true,
          fn: gtagFn,
        });
      } catch (e) {
        const errorMsg = `Preview error: ${String(e)}`;
        setLogs([errorMsg]);
      }
    }, 500),
  ).current;

  useEffect(() => {
    consoleLogRef(event, custom);
  }, [event, custom, consoleLogRef]);

  const boxHeightStyle = {
    height: `${height}px`,
  };

  return (
    <div className="my-4">
      <div className="flex gap-4" style={boxHeightStyle}>
        <CodeBox label="Event" value={event} onChange={setEvent} />

        <CodeBox label="Custom config" value={custom} onChange={setCustom} />

        <CodeBox
          label="Result"
          disabled={true}
          value={logs[0] || 'No event yet.'}
        />
      </div>
    </div>
  );
};

export default Mapping;
