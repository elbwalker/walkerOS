import type { WalkerOS } from '@elbwalker/types';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { debounce, isObject } from '@elbwalker/utils';
import { ObjectInspector, chromeDark } from 'react-inspector';
import { LiveProvider, LiveEditor, LiveError } from 'react-live';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';

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
  const [logs, setLogs] = useState<unknown[]>([]);

  const gtagFn = useCallback((...args: unknown[]) => {
    const params = args.map((arg) => {
      return isObject(arg) ? JSON.stringify(arg, null, 2) : `'${arg}'`;
    });
    setLogs([`gtag(${params.join(', ')})`]);
  }, []);

  const consoleLogRef = useRef(
    debounce((eventStr: string, customStr: string) => {
      try {
        const parsedEvent = JSON.parse(eventStr);
        const parsedCustom = JSON.parse(customStr);
        destinationGoogleGA4.push(parsedEvent, {
          custom: parsedCustom,
          init: true,
          fn: gtagFn,
        });
      } catch (e) {
        setLogs([`Preview error, ${String(e)}`]);
      }
    }, 1000),
  ).current;

  useEffect(() => {
    consoleLogRef(event, custom);
  }, [event, custom, consoleLogRef]);

  const consoleTheme = {
    ...chromeDark,
    BASE_BACKGROUND_COLOR: 'rgb(40, 44, 52)',
    TREENODE_FONT_SIZE: '14px',
    OBJECT_NAME_COLOR: '#01b5e2',
    OBJECT_VALUE_STRING_COLOR: '#01b5e2',
  } as unknown as string;

  const boxHeightStyle = {
    height: `${height}px`,
  };

  const transformCode = (inputCode: string) => inputCode;

  return (
    <div className="my-4">
      <div className="flex gap-4" style={boxHeightStyle}>
        <LiveProvider code={event} transformCode={transformCode}>
          <div className="w-1/3 border border-base-300 overflow-hidden flex flex-col">
            <div className="border-b border-base-300 px-2 py-1 bg-gray-200">
              JSON Object
            </div>
            <LiveEditor
              onChange={(newCode) => setEvent(newCode)}
              // style={{ flex: 1, overflow: 'auto', fontFamily: 'monospace' }}
            />
            <LiveError className="text-red-500 px-2" />
          </div>
        </LiveProvider>

        <LiveProvider code={custom} transformCode={transformCode}>
          <div className="w-1/3 border border-base-300 overflow-hidden flex flex-col">
            <div className="border-b border-base-300 px-2 py-1 bg-gray-200">
              Configuration
            </div>
            <LiveEditor
              onChange={(newCode) => setCustom(newCode)}
              style={{ flex: 1, overflow: 'auto', fontFamily: 'monospace' }}
            />
            <LiveError className="text-red-500 px-2" />
          </div>
        </LiveProvider>

        <div className="w-1/3 border border-base-300 overflow-hidden flex flex-col">
          <div className="border-b border-base-300 px-2 py-1 bg-gray-200">
            Result
          </div>
          <div
            className="flex-1 px-2 py-1 overflow-auto"
            style={{ backgroundColor: 'rgb(40, 44, 52)' }}
          >
            {logs.length === 0 ? (
              <div className="border-base-300 flex justify-center border-t px-4 py-10">
                No event yet.
              </div>
            ) : (
              logs.map((log, index) => (
                <ObjectInspector
                  key={index}
                  theme={consoleTheme}
                  data={log}
                  expandLevel={2}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <style>
        {`
          .live-editor {
            height: 100%;
          }
          .live-error {
            height: 50px;
            overflow: auto;
          }
        `}
      </style>
    </div>
  );
};

export default Mapping;
