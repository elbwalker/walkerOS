import type { WalkerOS } from '@elbwalker/types';
import { debounce, getId } from '@elbwalker/utils';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { elb } from '@elbwalker/walker.js';
import CodeBox from '../molecules/codeBox';

export const taggingRegistry = (() => {
  const registry = new Map<string, (message: WalkerOS.Event) => void>();

  return {
    add: (previewId: string, addLog: (message: WalkerOS.Event) => void) => {
      registry.set(previewId, addLog);
    },
    get: (previewId: string) => registry.get(previewId),
    delete: (previewId: string) => {
      registry.delete(previewId);
    },
    clear: () => registry.clear(),
  };
})();

interface PreviewProps {
  code: string;
  height?: number;
  hideCode?: boolean;
  hidePreview?: boolean;
  hideConsole?: boolean;
  previewId?: string;
}

const Tagging: React.FC<PreviewProps> = ({
  code,
  height = 400,
  hideCode = false,
  hidePreview = false,
  hideConsole = false,
  previewId = 'preview',
}) => {
  const [logs, setLogs] = useState<unknown[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [liveCode, setLiveCode] = useState(code.trim());
  const isFirstRender = useRef(true);

  const initPreview = useCallback(
    debounce((elem: HTMLElement) => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      elb('walker init', elem);
    }, 2000),
    [],
  );

  useEffect(() => {
    if (previewRef.current) {
      initPreview(previewRef.current);
    }
  }, [liveCode]);

  useEffect(() => {
    taggingRegistry.add(previewId, (log: WalkerOS.Event) => {
      setLogs((prevLogs) => [...prevLogs, log]);
    });

    return () => {
      taggingRegistry.delete(previewId);
    };
  }, [previewId]);

  const transformCode = (inputCode: string) => {
    return inputCode
      .trim()
      .replace(/class=/g, 'className=')
      .replace(/;$/, '');
  };

  const PreviewContent = () => {
    useEffect(() => {
      if (previewRef.current) {
        previewRef.current.innerHTML = transformCode(liveCode);
      }
    }, [liveCode]);

    return (
      <div
        ref={previewRef}
        data-elbcontext={`previewId:${previewId}`}
        className="h-full"
      />
    );
  };

  return (
    <div className="m-2">
      <div className="flex flex-col xl:flex-row gap-2" style={{ height: '400px' }}>
        {!hideCode && (
          <CodeBox label="Code" value={liveCode} onChange={setLiveCode} />
        )}

        {!hidePreview && (
          <div className="flex-1 flex flex-col border border-base-300 rounded-lg overflow-hidden bg-gray-800">
            <div className="font-bold px-2 py-1 bg-base-100 text-base">
              Preview
            </div>
            <div className="flex-1 bg-gray-800 overflow-auto">
              <div className="p-6 h-full">
                <PreviewContent />
              </div>
            </div>
          </div>
        )}

        {!hideConsole && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <CodeBox
              label="Console"
              value={
                logs.length === 0
                  ? 'No events yet.'
                  : JSON.stringify(logs, null, 2)
              }
              disabled={true}
              isConsole={true}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Tagging;
