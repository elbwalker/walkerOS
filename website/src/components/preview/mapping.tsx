import type { WalkerOS } from '@elbwalker/types';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { debounce, isObject } from '@elbwalker/utils';
import { LiveProvider, LiveEditor, LiveError } from 'react-live';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';
import { Highlight, themes as prismThemes } from 'prism-react-renderer';

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
    setLogs([`gtag(${params});`]);
  }, []);

  const consoleLogRef = useRef(
    debounce((eventStr: string, customStr: string) => {
      setLogs([]);
      try {
        const parsedEvent = JSON.parse(eventStr);
        const parsedCustom = JSON.parse(customStr);
        destinationGoogleGA4.push(parsedEvent, {
          custom: parsedCustom,
          init: true,
          fn: gtagFn,
        });
      } catch (e) {
        setLogs([`Preview error: ${String(e)}`]);
      }
    }, 500),
  ).current;

  useEffect(() => {
    consoleLogRef(event, custom);
  }, [event, custom, consoleLogRef]);

  const boxHeightStyle = {
    height: `${height}px`,
  };

  const transformCode = (inputCode: string) => inputCode;

  return (
    <div className="my-4">
      <div className="flex gap-4" style={boxHeightStyle}>
        {/* Event Editor */}
        <LiveProvider code={event} transformCode={transformCode}>
          <div className="w-1/3 border border-base-300 overflow-hidden flex flex-col">
            <div className="border-b border-base-300 px-2 py-1 text-center">
              Event
            </div>
            <LiveEditor onChange={(newCode) => setEvent(newCode)} />
            <LiveError className="text-red-500 px-2" />
          </div>
        </LiveProvider>

        {/* Custom Config Editor */}
        <LiveProvider code={custom} transformCode={transformCode}>
          <div className="w-1/3 border border-base-300 overflow-hidden flex flex-col">
            <div className="border-b border-base-300 px-2 py-1 text-center">
              Custom config
            </div>
            <LiveEditor
              onChange={(newCode) => setCustom(newCode)}
              style={{ flex: 1, overflow: 'auto', fontFamily: 'monospace' }}
            />
            <LiveError className="text-red-500 px-2" />
          </div>
        </LiveProvider>

        {/* Console Output */}
        <div className="w-1/3 border border-base-300 overflow-hidden flex flex-col">
          <div className="border-b border-base-300 px-2 py-1 text-center">
            Result
          </div>
          <div className="flex-1 px-2 py-1 overflow-auto">
            {logs.length === 0 ? (
              <div className="border-base-300 flex justify-center border-t px-4 py-10">
                No event yet.
              </div>
            ) : (
              logs.map((log, index) => (
                <Highlight
                  // {...defaultProps}
                  key={index}
                  theme={prismThemes.palenight}
                  code={String(log)}
                  language="javascript"
                >
                  {({
                    className,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps,
                  }) => (
                    <pre className={className} style={{ ...style, margin: 0 }}>
                      {tokens.map((line, i) => (
                        <div {...getLineProps({ line, key: i })} key={i}>
                          {line.map((token, key) => (
                            <span
                              {...getTokenProps({ token, key })}
                              key={key}
                            />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Optional: Additional Styling */}
      <style>
        {`
          .live-editor {
            height: 100%;
          }
          .live-error {
            height: 50px;
            overflow: auto;
          }
          pre {
            font-family: 'Fira Code', monospace;
            font-size: 14px;
          }
        `}
      </style>
    </div>
  );
};

export default Mapping;
