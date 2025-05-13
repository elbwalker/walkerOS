import type { WalkerOS } from '@elbwalker/types';
import type { TypewriterOptions } from '@site/src/components/molecules/typewriterCode';
import { debounce, tryCatch } from '@elbwalker/utils';
import { useEffect, useRef, useState, useCallback, FC } from 'react';
import { elb } from '@elbwalker/walker.js';
import CodeBox from '@site/src/components/molecules/codeBox';
import FullScreenMode from '@site/src/components/organisms/fullScreenMode';
import { resetTypewriter } from '@site/src/components/molecules/typewriterCode';
import '@site/src/css/highlighting.scss';

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
  height?: string;
  hideCode?: boolean;
  hidePreview?: boolean;
  hideConsole?: boolean;
  previewId?: string;
  fn?: (event: WalkerOS.Event) => void;
  typewriter?: TypewriterOptions;
}

const Tagging: FC<PreviewProps> = ({
  code,
  height = '400px',
  hideCode = false,
  hidePreview = false,
  hideConsole = false,
  previewId = 'preview',
  fn,
  typewriter,
}) => {
  const [logs, setLogs] = useState<string>();
  const previewRef = useRef<HTMLDivElement>(null);
  const [liveCode, setLiveCode] = useState(code.trim());
  const [isPaused, setIsPaused] = useState(false);
  const [highlights, setHighlights] = useState({
    globals: false,
    context: false,
    entity: false,
    property: false,
    action: false,
  });

  useEffect(() => {
    setLiveCode(code.trim());
  }, [code]);

  const initialCode = useRef(code.trim());

  const initPreview = useCallback(
    debounce(
      (elem: HTMLElement) => {
        elb('walker init', elem);
      },
      1000,
      true,
    ),
    [],
  );

  const updatePreviewContent = useCallback(
    debounce(
      (code: string) => {
        if (!previewRef.current) return;

        previewRef.current.innerHTML = code.trim().replace(/;$/, '');

        // Then find all entities and mark their properties
        const entities = Array.from(
          previewRef.current.querySelectorAll('[data-elb]'),
        )
          .map((el) => el.getAttribute('data-elb'))
          .filter((entity): entity is string => !!entity);

        entities.forEach((entity) => {
          tryCatch(() => {
            previewRef.current
              ?.querySelectorAll(`[data-elb-${entity}]`)
              .forEach((el) => {
                el.setAttribute('data-elbproperty', '');
              });
          })();
        });

        // Initialize walker
        initPreview(previewRef.current);
      },
      200,
      true,
    ),
    [initPreview],
  );

  useEffect(() => {
    updatePreviewContent(liveCode);
    setLogs(undefined);
  }, [liveCode, updatePreviewContent]);

  useEffect(() => {
    taggingRegistry.add(previewId, (event) => {
      delete event.context.previewId;
      setLogs(JSON.stringify(fn ? fn(event) : event, null, 2));
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

  const boxClassNames = `flex-1 resize flex flex-col max-h-96 lg:max-h-full`;
  const highlightGlobals = highlights.globals ? 'highlight-globals' : '';
  const highlightContext = highlights.context ? 'highlight-context' : '';
  const highlightEntity = highlights.entity ? 'highlight-entity' : '';
  const highlightProperty = highlights.property ? 'highlight-property' : '';
  const highlightAction = highlights.action ? 'highlight-action' : '';

  return (
    <FullScreenMode className="m-4">
      <div
        className="flex flex-col lg:flex-row gap-2 scroll"
        style={{ height }}
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
                <div ref={previewRef} className="h-full" />
              </div>
            </div>
            <div className="elb-highlight-buttons">
              <button
                onClick={() => toggleHighlight('context')}
                className={`btn-context ${highlightContext}`}
              >
                Context
              </button>
              <button
                onClick={() => toggleHighlight('entity')}
                className={`btn-entity ${highlightEntity}`}
              >
                Entity
              </button>
              <button
                onClick={() => toggleHighlight('property')}
                className={`btn-property ${highlightProperty}`}
              >
                Property
              </button>
              <button
                onClick={() => toggleHighlight('action')}
                className={`btn-action ${highlightAction}`}
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
              value={logs || 'No event yet.'}
              disabled={true}
              isConsole={true}
              className={boxClassNames}
              showReset={true}
              onReset={() => setLogs('')}
            />
          </div>
        )}
      </div>
    </FullScreenMode>
  );
};

export default Tagging;
