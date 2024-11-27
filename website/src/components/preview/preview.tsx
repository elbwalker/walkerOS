import type { WalkerOS } from '@elbwalker/types';
import { getId } from '@elbwalker/utils';
import React, { useState } from 'react';
import { ObjectInspector, chromeDark } from 'react-inspector';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';

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

const Preview: React.FC<PreviewProps> = ({
  code,
  height = 400,
  hideCode = false,
  hidePreview = false,
  hideConsole = false,
}) => {
  const previewId = getId();
  const [logs, setLogs] = useState<unknown[]>([]);

  previewRegistry.add(previewId, (log: WalkerOS.Event) => {
    setLogs((prevLogs) => [...prevLogs, log]);
  });

  const theme = {
    ...chromeDark,
    ...{
      // OBJECT_NAME_COLOR: '#01b5e2',
      OBJECT_VALUE_STRING_COLOR: '#01b5e2',
    },
  } as unknown as string;

  const boxHeightStyle = {
    height: `${height}px`,
  };

  return (
    <div className="m-4" data-elbcontext={`previewId:${previewId}`}>
      <LiveProvider code={code}>
        <LiveError className="mt-2 text-red-500" />
        <div className="flex gap-4" style={boxHeightStyle}>
          {!hideCode && (
            <div
              className="mockup-code w-1/3 border border-base-300 overflow-hidden"
              style={boxHeightStyle}
            >
              <div className="border-t border-base-300 px-2 pb-4 overflow-y-auto h-full">
                <LiveEditor />
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
              <div className="bg-base-200 border-t border-base-300 px-2 pb-8 overflow-y-auto h-full">
                <LivePreview />
              </div>
            </div>
          )}

          {!hideConsole && (
            <div
              className="mockup-code w-1/3 border border-base-300 overflow-hidden"
              style={boxHeightStyle}
            >
              <div className="border-t border-base-300 px-2 pb-4 overflow-y-auto h-full">
                {logs.length === 0 ? (
                  <div className="border-base-300 flex justify-center border-t px-4 py-10">No events yet.</div>
                ) : (
                  logs.map((log, index) => (
                    <ObjectInspector
                      key={index}
                      theme={theme}
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
