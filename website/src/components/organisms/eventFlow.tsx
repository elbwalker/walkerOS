import { FC, useCallback, useEffect, useRef, useState } from 'react';
import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationWeb } from '@elbwalker/walker.js';
import { elb } from '@elbwalker/walker.js';
import CodeBox from '@site/src/components/molecules/codeBox';
import FullScreenMode from '@site/src/components/organisms/fullScreenMode';
import { resetTypewriter, TypewriterOptions } from '@site/src/components/molecules/typewriterCode';
import { formatValue, parseInput } from '@site/src/components/molecules/codeBox';
import '@site/src/css/highlighting.scss';
import { debounce, destinationPush, tryCatch } from '@elbwalker/utils';

interface EventFlowProps {
  code: string;
  height?: string;
  previewId?: string;
  fn?: (event: WalkerOS.Event) => WalkerOS.Event;
  typewriter?: TypewriterOptions;
  destination: DestinationWeb.Destination;
  initialConfig?: WalkerOS.AnyObject;
  fnName?: string;
}

export const EventFlow: FC<EventFlowProps> = ({
  code,
  height = '400px',
  previewId = 'preview',
  fn,
  typewriter,
  destination,
  initialConfig = {},
  fnName,
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
  const [customConfig, setConfig] = useState<WalkerOS.AnyObject>(initialConfig);
  const [event, setEvent] = useState<WalkerOS.Event | null>(null);

  const toggleHighlight = (type: keyof typeof highlights) => {
    setHighlights((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

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
    const handleEvent = (event: WalkerOS.Event) => {
      delete event.context.previewId;
      const processedEvent = fn ? fn(event) : event;
      setEvent(processedEvent);
      setLogs(JSON.stringify(processedEvent, null, 2));
    };

    elb('walker destination', {
      push: (e) => {
        const previewId = e.context?.previewId?.[0];
        if (previewId === previewId) handleEvent(e);
      },
    });

    return () => {
      elb('walker destination', { push: () => {} });
    };
  }, [previewId, fn]);

  const handleMapping = useCallback(
    (input: unknown, config: unknown, log: (...args: unknown[]) => void) => {
      try {
        const inputValue = parseInput(input);
        const configValue = parseInput(config);
        const [entity, action] = event.event.split(' ');
        const finalMapping = { [entity]: { [action]: configValue } };

        destinationPush(
          { hooks: {}, consent: event.consent } as never,
          {
            ...destination,
            config: {
              custom: customConfig,
              fn: log,
              mapping: finalMapping as Mapping.Config,
            },
          },
          event,
        );
      } catch (error) {
        log(`Error mappingFn: ${error}`);
      }
    },
    [event, destination, customConfig],
  );

  const boxClassNames = `flex-1 resize flex flex-col max-h-96 lg:max-h-full`;
  const highlightGlobals = highlights.globals ? 'highlight-globals' : '';
  const highlightContext = highlights.context ? 'highlight-context' : '';
  const highlightEntity = highlights.entity ? 'highlight-entity' : '';
  const highlightProperty = highlights.property ? 'highlight-property' : '';
  const highlightAction = highlights.action ? 'highlight-action' : '';

  return (
    <FullScreenMode className="m-4">
      <div
        className="flex flex-row gap-2 overflow-x-auto scrollbar-hide"
        style={{ height }}
      >
        <CodeBox
          label="HTML"
          value={liveCode}
          onChange={setLiveCode}
          showReset={true}
          onReset={() => {
            setLiveCode(code.trim());
            resetTypewriter();
            setIsPaused(false);
          }}
          className={boxClassNames}
          typewriter={typewriter}
        />

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

        <CodeBox
          label="Event"
          value={logs || 'No event yet.'}
          disabled={true}
          isConsole={true}
          className={boxClassNames}
          showReset={true}
          onReset={() => setLogs('')}
        />

        <CodeBox
          label="Mapping"
          value={formatValue({})}
          onChange={(value) => {
            try {
              const parsed = parseInput(value);
              setConfig(parsed);
            } catch (error) {
              console.error('Error parsing mapping:', error);
            }
          }}
          className={boxClassNames}
        />

        <CodeBox
          label="Command"
          value={formatValue({})}
          disabled={true}
          isConsole={true}
          className={boxClassNames}
        />
      </div>
    </FullScreenMode>
  );
};

export default EventFlow; 