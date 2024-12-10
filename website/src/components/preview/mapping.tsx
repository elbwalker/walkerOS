import type { WalkerOS } from '@elbwalker/types';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { debounce, isObject } from '@elbwalker/utils';
import destinationGoogleGA4 from '@elbwalker/destination-web-google-ga4';
import { Highlight, themes as prismThemes } from 'prism-react-renderer';
import Editor from 'react-simple-code-editor';

interface CodeBoxProps {
  label: string;
  value: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  language?: string;
}

const CodeBox: React.FC<CodeBoxProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  language = 'javascript',
}) => {
  const highlightCode = (code: string) => (
    <Highlight theme={prismThemes.palenight} code={code} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <>
          {tokens.map((line, i) => (
            <div {...getLineProps({ line, key: i })} key={i}>
              {line.map((token, key) => (
                <span {...getTokenProps({ token, key })} key={key} />
              ))}
            </div>
          ))}
        </>
      )}
    </Highlight>
  );

  return (
    <div className="w-1/3 border border-base-300 overflow-hidden flex flex-col">
      <div className="border-b border-base-300 px-2 py-1 text-center">
        {label}
      </div>
      <div className="flex-1 overflow-auto">
        <Editor
          value={value}
          disabled={disabled}
          onValueChange={onChange}
          highlight={highlightCode}
          padding={10}
          style={{
            fontFamily: '"Fira Code", monospace',
            fontSize: 14,
            backgroundColor: '#282c34',
            color: '#abb2bf',
            minHeight: '100%',
            outline: 'none',
          }}
          className="code-editor"
        />
      </div>
    </div>
  );
};

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

  const gtagFn = useCallback((...args: unknown[]) => {
    const params = args.map((arg) => {
      return isObject(arg) ? JSON.stringify(arg, null, 2) : `"${arg}"`;
    });
    setLogs([`gtag(${params.join(', ')})`]);
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
          disabled={false}
          value={logs[0] || 'No event yet.'}
        />
      </div>

      <style>
        {`
          .code-editor {
            outline: none;
          }
          pre {
            margin: 0;
          }
        `}
      </style>
    </div>
  );
};

export default Mapping;
