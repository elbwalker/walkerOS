import type { WalkerOS } from '@elbwalker/types';
import { debounce, getId, tryCatch } from '@elbwalker/utils';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { elb } from '@elbwalker/walker.js';
import CodeBox from '../molecules/codeBox';
import FullScreenOverlay from '../molecules/codeBoxOverlay';
import FullScreenButton from '../molecules/fullScreenButton';
import type { TypewriterOptions } from '../molecules/typewriterCode';
import { resetTypewriter, pauseTypewriter } from '../molecules/typewriterCode';
import '../../css/highlighting.scss';

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
  const [isPaused, setIsPaused] = useState(false);
  const [highlights, setHighlights] = useState({
    globals: false,
    context: false,
    entity: false,
    property: false,
    action: false,
  });

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

  const toggleHighlight = (type: keyof typeof highlights) => {
    setHighlights((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const addPropertyClass = useCallback(
    debounce(() => {
      if (!previewRef.current) return;
      previewRef.current.querySelectorAll('[data-elb]').forEach((entity) => {
        const entityType = entity.getAttribute('data-elb');

        if (!entityType) return;

        previewRef.current
          .querySelectorAll(`[data-elb-${entityType}]`)
          .forEach((prop) => {
            prop.classList.add('is-property');
          });
      });
    }, 200),
    [],
  );

  const PreviewContent = () => {
    useEffect(() => {
      if (previewRef.current) {
        previewRef.current.innerHTML = liveCode.trim().replace(/;$/, '');
        addPropertyClass();
      }
    }, [liveCode]);

    return <div ref={previewRef} className="h-full" />;
  };

  const boxClassNames = `flex-1 resize flex flex-col ${isFullScreen ? 'max-h-[calc(100vh-12rem)]' : 'max-h-96 xl:max-h-full'}`;

  const highlightGlobals = highlights.globals && 'highlight-globals';
  const highlightContext = highlights.context && 'highlight-context';
  const highlightEntity = highlights.entity && 'highlight-entity';
  const highlightProperty = highlights.property && 'highlight-property';
  const highlightAction = highlights.action && 'highlight-action';

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
            setIsPaused(false);
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
          </div>
          <div
            data-elbcontext={`previewId:${previewId}`}
            className="flex-1 bg-gray-800 overflow-auto elb-highlight"
          >
            <div
              className={`p-6 h-full ${highlightGlobals} ${highlightContext} ${highlightEntity} ${highlightProperty} ${highlightAction}`}
            >
              <PreviewContent />
            </div>
          </div>
          <div className="flex bg-base-100 border-t border-base-300 elb-highlight-buttons">
            <button
              onClick={() => toggleHighlight('globals')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium btn-globals ${highlightGlobals}`}
            >
              Globals
            </button>
            <button
              onClick={() => toggleHighlight('context')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium btn-context ${highlightContext}`}
            >
              Context
            </button>
            <button
              onClick={() => toggleHighlight('entity')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium btn-entity ${highlightEntity}`}
            >
              Entity
            </button>
            <button
              onClick={() => toggleHighlight('property')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium btn-property ${highlightProperty}`}
            >
              Property
            </button>
            <button
              onClick={() => toggleHighlight('action')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium btn-action ${highlightAction}`}
            >
              Action
            </button>
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
    <div className="m-4">
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
