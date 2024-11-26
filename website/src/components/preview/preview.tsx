import type { CSSProperties } from 'react';
import React, { useState, useRef } from 'react';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';
import ReactShadowRoot from 'react-shadow-root';
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
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);

  const customConsole = {
    log: (...args: unknown[]) => {
      const message = args.map((arg) => String(arg)).join(' ');
      logRef.current = [...logRef.current, message];
      setLogs([...logRef.current]);
    },
  };

  const scope = { React, console: customConsole };

  const editorStyle: CSSProperties = {
    maxHeight: `${height}px`,
    overflowY: 'scroll',
  };

  const containerStyle: CSSProperties = {
    height: `${height}px`,
  };

  return (
    <div className={styles.previewContainer}>
      <LiveProvider code={code} scope={scope}>
        <LiveError className="mt-2 text-red-500" />

        <div className="flex gap-4" style={containerStyle}>
          {!hideCode && (
            <div className="flex flex-col w-1/3 border border-gray-300 rounded-md overflow-hidden">
              <div className="bg-gray-200 p-2 font-bold text-center">Code</div>
              <div className="flex-1" style={editorStyle}>
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
                <div className="h-full">
                  <ShadowPreview />
                </div>
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
                    <div key={index} className="font-mono text-sm">
                      {log}
                    </div>
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

const ShadowPreview: React.FC = () => {
  const style = `:host {
    display: inline-flex;
  }`;

  return (
    <div className={styles.shadowPreview}>
      <ReactShadowRoot>
        <style>{style}</style>
        <LivePreview />
      </ReactShadowRoot>
    </div>
  );
};

export default Preview;
