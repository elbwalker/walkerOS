import type { WalkerOS } from '@elbwalker/types';
import { debounce, getId } from '@elbwalker/utils';
import React, { useEffect, useRef, useState } from 'react';
import { ObjectInspector, chromeDark } from 'react-inspector';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';
import { themes as prismThemes } from 'prism-react-renderer';
import { elb } from '@elbwalker/walker.js';

type AddLogFunction = (message: WalkerOS.Event) => void;

class PreviewRegistry {
  private registry = new Map<string, AddLogFunction>();

  add(previewId: string, addLog: AddLogFunction): void {
    this.registry.set(previewId, addLog);
  }

  get(previewId: string): AddLogFunction | undefined {
    return this.registry.get(previewId);
  }

  delete(previewId: string): void {
    this.registry.delete(previewId);
  }
}

export const previewRegistry = new PreviewRegistry();

interface PreviewProps {
  code: string;
  height?: number;
  hideCode?: boolean;
  hidePreview?: boolean;
  hideConsole?: boolean;
}

const initPreview = debounce(
  (elem?: HTMLElement) => elb('walker init', elem),
  2000,
);

const Preview: React.FC<PreviewProps> = ({
  code,
  height = 400,
  hideCode = false,
  hidePreview = false,
  hideConsole = false,
}) => {
  const previewId = useRef(getId()).current;
  const [logs, setLogs] = useState<unknown[]>([123]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [liveCode, setLiveCode] = useState(code.trim());

  useEffect(() => {
    initPreview(previewRef?.current);
  }, [liveCode]);

  useEffect(() => {
    previewRegistry.add(previewId, (log: WalkerOS.Event) => {
      setLogs((prevLogs) => [...prevLogs, log]);
    });

    return () => {
      previewRegistry.delete(previewId);
    };
  }, [previewId]);

  const consoleTheme = {
    ...chromeDark,
    ...{
      BASE_BACKGROUND_COLOR: 'rgb(40, 44, 52)',
      TREENODE_FONT_SIZE: '14px',
      OBJECT_NAME_COLOR: '#01b5e2',
      OBJECT_VALUE_STRING_COLOR: '#01b5e2',
    },
  } as unknown as string;

  const boxHeightStyle = {
    height: `${height}px`,
  };

  const transformCode = (inputCode: string) => {
    return inputCode.replace(/class=/g, 'className=');
  };

  return (
    <div className="m-4" data-elbcontext={`previewId:${previewId}`}>
      <LiveProvider
        code={liveCode}
        theme={prismThemes.palenight}
        language="html"
        transformCode={transformCode}
      >
        <LiveError className="mt-2 text-red-500" />
        <div className="flex gap-4" style={boxHeightStyle}>
          {!hideCode && (
            <div
              className="mockup-code w-1/3 border border-base-300 overflow-hidden"
              style={boxHeightStyle}
            >
              <div className="border-t border-base-300 px-2 pb-4 overflow-y-auto h-full">
                <LiveEditor
                  onChange={(newCode) => {
                    setLiveCode(newCode);
                  }}
                />
              </div>
            </div>
          )}

          {!hidePreview && (
            <div
              className="mockup-browser w-1/3 border border-base-300 bg-base-300 overflow-hidden"
              style={boxHeightStyle}
            >
              <div className="mockup-browser-toolbar">
                <div className="input">localhost:9001</div>
              </div>
              <div
                ref={previewRef}
                className="bg-base-200 border-t border-base-300 px-2 pb-8 overflow-y-auto h-full"
              >
                <LivePreview />
              </div>
            </div>
          )}

          {!hideConsole && (
            <div
              className="mockup-code w-1/3 border border-base-300 overflow-hidden"
              style={boxHeightStyle}
            >
              <div
                className="border-t border-base-300 mx-2 pb-4 overflow-y-auto h-full"
                style={{ backgroundColor: 'rgb(40, 44, 52)' }}
              >
                {logs.length === 0 ? (
                  <div className="border-base-300 flex justify-center border-t px-4 py-10">
                    No events yet.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <ObjectInspector
                      key={index}
                      theme={consoleTheme}
                      data={log}
                      className="text-sm"
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </LiveProvider>
    </div>
  );
};

export default Preview;
