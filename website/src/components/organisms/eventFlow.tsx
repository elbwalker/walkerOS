import { FC, useCallback, useEffect, useRef, useState } from 'react';
import type { Mapping, WalkerOS } from '@elbwalker/types';
import CodeBox, { formatValue } from '@site/src/components/molecules/codeBox';
import Preview from '@site/src/components/molecules/preview';
import FullScreenMode from '@site/src/components/organisms/fullScreenMode';
import { parseInput } from '@site/src/components/molecules/codeBox';
import '@site/src/css/highlighting.scss';
import {
  destinationPush,
  debounce,
  isString,
  tryCatchAsync,
} from '@elbwalker/utils';
import { taggingRegistry } from './tagging';

interface EventFlowProps {
  code: string;
  mapping?: string | Mapping.Config;
  height?: string;
  previewId?: string;
  eventFn?: (event: WalkerOS.Event) => WalkerOS.Event;
  resultFn?: (output: unknown) => string;
}

export const EventFlow: FC<EventFlowProps> = ({
  code,
  mapping,
  height = '400px',
  previewId = 'preview',
  eventFn,
  resultFn,
}) => {
  const [htmlCode, setHtmlCode] = useState(code.trim());
  const [eventCode, setEventCode] = useState<string>(undefined);
  const [mappingCode, setMappingCode] = useState<string | undefined>(
    isString(mapping) ? mapping : formatValue(mapping),
  );
  const [resultCode, setResultCode] = useState<string>('');

  const updateEventCode = useCallback(
    debounce(
      (code: string) => {
        setEventCode(code);
      },
      1,
      true,
    ),
    [],
  );

  const createResult = useRef(
    debounce(async (eventStr: string, mappingStr: string) => {
      tryCatchAsync(
        async () => {
          if (!eventStr) return;

          const event = (await parseInput(eventStr)) as WalkerOS.Event;
          const mapping = (await parseInput(mappingStr)) as Mapping.Config;
          await destinationPush(
            window.walkerjs,
            {
              push: (event, config, mapping, options) => {
                const value = options.data || event;

                setResultCode(formatValue(resultFn ? resultFn(value) : value));
              },
              config: {
                mapping,
              },
            },
            { ...event },
          );
        },
        (err) => {
          setResultCode(formatValue({ error: String(err) }));
        },
      )();
    }, 600),
  ).current;

  useEffect(() => {
    createResult(eventCode, mappingCode);
  }, [eventCode, mappingCode]);

  useEffect(() => {
    taggingRegistry.add(previewId, (event) => {
      delete event.context.previewId;
      updateEventCode(JSON.stringify(eventFn ? eventFn(event) : event));
    });

    return () => {
      taggingRegistry.delete(previewId);
    };
  }, [previewId]);

  const boxClassNames = `flex-1 resize flex flex-col max-h-96 lg:max-h-full`;

  return (
    <FullScreenMode className="m-4">
      <div
        className="flex flex-row gap-4 overflow-x-auto scrollbar-hide h-full"
        style={{ height }}
      >
        <div className="w-1/3 flex-shrink-0 flex flex-col">
          <CodeBox
            label="HTML"
            value={htmlCode}
            onChange={setHtmlCode}
            showReset={true}
            onReset={() => {
              setHtmlCode(code.trim());
            }}
            className={boxClassNames}
          />
        </div>

        <div className="w-1/3 flex-shrink-0 flex flex-col">
          <Preview
            code={htmlCode}
            previewId={previewId}
            boxClassNames={boxClassNames}
          />
        </div>

        <div className="w-1/3 flex-shrink-0 flex flex-col">
          <CodeBox
            label="Event"
            value={eventCode || 'No event yet.'}
            onChange={setEventCode}
            isConsole={true}
            className={boxClassNames}
          />
        </div>

        <div className="w-1/3 flex-shrink-0 flex flex-col">
          <CodeBox
            label="Mapping"
            value={formatValue(mappingCode)}
            onChange={setMappingCode}
            className={boxClassNames}
          />
        </div>

        <div className="w-1/3 flex-shrink-0 flex flex-col">
          <CodeBox
            label="Result"
            value={resultCode || 'No result yet.'}
            disabled={true}
            isConsole={true}
            className={boxClassNames}
          />
        </div>
      </div>
    </FullScreenMode>
  );
};

export default EventFlow;
