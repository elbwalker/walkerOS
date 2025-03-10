import type { WalkerOS } from '@elbwalker/types';
import { debounce, getId } from '@elbwalker/utils';
import React, { useEffect, useRef, useState } from 'react';
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
}

const initPreview = debounce(
  (elem?: HTMLElement) => elb('walker init', elem),
  2000,
);

const Tagging: React.FC<PreviewProps> = ({
  code,
  height = 400,
  hideCode = false,
  hidePreview = false,
  hideConsole = false,
}) => {
  const previewId = useRef(getId()).current;
  const [logs, setLogs] = useState<unknown[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [liveCode, setLiveCode] = useState(code.trim());

  useEffect(() => {
    initPreview(previewRef?.current);
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
    return inputCode.replace(/class=/g, 'className=');
  };

  return (
    <div className="my-4" data-elbcontext={`previewId:${previewId}`}>
      <div className="flex flex-col xl:flex-row gap-2">
        {!hideCode && (
          <CodeBox
            label="Code"
            value={liveCode}
            onChange={setLiveCode}
            className="flex-1"
          />
        )}

        {!hidePreview && (
          <div className="flex-1 border border-base-300 rounded-lg overflow-hidden bg-gray-800">
            <div className="font-bold px-2 py-1 bg-base-100 text-base">Preview</div>
            <div
              ref={previewRef}
              className="p-4 bg-white dark:bg-gray-900"
              style={{ height: `${height - 40}px`, overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: transformCode(liveCode) }}
            />
          </div>
        )}

        {!hideConsole && (
          <CodeBox
            label="Console"
            value={logs.length === 0 ? 'No events yet.' : JSON.stringify(logs, null, 2)}
            disabled={true}
            className="flex-1"
          />
        )}
      </div>
    </div>
  );
};

export default Tagging;
