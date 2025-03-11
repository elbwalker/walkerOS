import type { WalkerOS } from '@elbwalker/types';
import { debounce, getId } from '@elbwalker/utils';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { elb } from '@elbwalker/walker.js';
import CodeBox from '../molecules/codeBox';
import FullScreenOverlay from '../molecules/codeBoxOverlay';
import FullScreenButton from '../molecules/fullScreenButton';
import type { TypewriterOptions } from '../molecules/typewriterCode';
import { resetTypewriter } from '../molecules/typewriterCode';

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
  typewriter?: TypewriterOptions;
}

const Tagging: React.FC<PreviewProps> = ({
  code,
  height = 400,
  hideCode = false,
  hidePreview = false,
  hideConsole = false,
  previewId = 'preview',
  typewriter,
}) => {
  const [logs, setLogs] = useState<unknown[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const initialCode = useRef(code.trim());
  const [liveCode, setLiveCode] = useState(initialCode.current);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const initPreview = useCallback(
    debounce(
      (elem: HTMLElement) => {
        elb('walker init', elem);
      },
      2000,
      true,
    ),
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

  const boxClassNames = `flex-1 resize flex flex-col ${isFullScreen ? 'max-h-[calc(100vh-12rem)]' : 'max-h-96 xl:max-h-full'}`;

  const renderBoxes = (isFullScreenMode = false) => (
    <div
      className={`flex flex-col xl:flex-row gap-2 scroll ${isFullScreenMode ? 'h-full' : ''}`}
      style={!isFullScreenMode ? { height: '400px' } : undefined}
    >
      {!hideCode && (
        <CodeBox
          label="Code"
          value={liveCode}
          onChange={setLiveCode}
          showReset={true}
          onReset={() => {
            setLiveCode(initialCode.current);
            resetTypewriter();
          }}
          className={boxClassNames}
          smallText={isFullScreenMode ? false : undefined}
          typewriter={typewriter}
        />
      )}

      {!hidePreview && (
        <div
          className={`flex-1 flex flex-col border border-base-300 rounded-lg overflow-hidden bg-gray-800 ${boxClassNames}`}
        >
          <div className="font-bold px-2 py-1.5 bg-base-100 text-base flex justify-between items-center">
            <span>Preview</span>
            <div className="w-[68px]" />
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
            className={boxClassNames}
            smallText={isFullScreenMode ? false : undefined}
            showReset={true}
            onReset={() => setLogs([])}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="my-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-end">
          <FullScreenButton onClick={() => setIsFullScreen(true)} />
        </div>
        {renderBoxes()}
      </div>
      <FullScreenOverlay
        isOpen={isFullScreen}
        onClose={() => setIsFullScreen(false)}
      >
        {renderBoxes(true)}
      </FullScreenOverlay>
    </div>
  );
};

export default Tagging;
