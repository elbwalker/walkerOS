import type { CSSProperties } from 'react';
import React, { useState } from 'react';
import { ObjectInspector, chromeDark } from 'react-inspector';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';
import styles from './Preview.module.css';

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
  const [logs, setLogs] = useState<unknown[]>([]);
  const addLog = (log: unknown) => {
    setLogs((prevLogs) => [...prevLogs, log]);
  };

  const theme = {
    ...chromeDark,
    ...{
      // OBJECT_NAME_COLOR: '#01b5e2',
      OBJECT_VALUE_STRING_COLOR: '#01b5e2',
    },
  } as unknown as string;

  const scope = { React, console: window.console, addLog };

  const containerStyle: CSSProperties = {
    // height: `${height}px`,
    maxHeight: `${height}px`,
    overflowY: 'scroll',
  };

  return (
    <div className={styles.previewContainer}>
      <LiveProvider code={code} scope={scope}>
        <LiveError className="mt-2 text-red-500" />
        <div className="flex gap-4" style={containerStyle}>
          {!hideCode && (
            <div className="flex flex-col w-1/3 border border-gray-300 rounded-md overflow-hidden">
              <div className="bg-gray-200 p-2 font-bold text-center">Code</div>
              <div className="flex-1">
                <LiveEditor className="h-full" />
              </div>
            </div>
          )}

          {!hidePreview && (
            <div className="flex flex-col w-1/3 border border-gray-300 rounded-md overflow-hidden">
              <div className="bg-gray-200 p-2 font-bold text-center">
                Preview
              </div>
              <div className="flex-1">
                <LivePreview className="h-full" />
              </div>
            </div>
          )}

          {!hideConsole && (
            <div className="flex flex-col w-1/3 border border-gray-300 rounded-md overflow-hidden">
              <div className="bg-gray-200 p-2 font-bold text-center">
                Console
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 bg-gray-900 text-white h-full">
                  {logs.map((log, index) => (
                    <ObjectInspector key={index} theme={theme} data={log} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </LiveProvider>
    </div>
  );
};

export default Preview;
