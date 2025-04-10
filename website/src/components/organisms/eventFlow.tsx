import { FC, useCallback, useEffect, useState } from 'react';
import type { Mapping, WalkerOS } from '@elbwalker/types';
import type { DestinationWeb } from '@elbwalker/walker.js';
import { elb } from '@elbwalker/walker.js';
import CodeBox from '@site/src/components/molecules/codeBox';
import Preview from '@site/src/components/molecules/preview';
import FullScreenMode from '@site/src/components/organisms/fullScreenMode';
import {
  resetTypewriter,
  TypewriterOptions,
} from '@site/src/components/molecules/typewriterCode';
import { parseInput } from '@site/src/components/molecules/codeBox';
import '@site/src/css/highlighting.scss';
import { destinationPush } from '@elbwalker/utils';
import { taggingRegistry } from './tagging';

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
  const [htmlCode, setHtmlCode] = useState(code.trim());
  const [eventCode, setEventCode] = useState<string>('');
  const [mappingCode, setMappingCode] = useState<string>('');
  const [commandCode, setCommandCode] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [customConfig, setConfig] = useState<WalkerOS.AnyObject>(initialConfig);
  const [currentEvent, setCurrentEvent] = useState<WalkerOS.Event | null>(null);

  useEffect(() => {
    setEventCode('');
    setCommandCode('');
  }, [htmlCode]);

  useEffect(() => {
    taggingRegistry.add(previewId, (event) => {
      delete event.context.previewId;
      const processedEvent = fn ? fn(event) : event;
      setCurrentEvent(processedEvent);
      setEventCode(JSON.stringify(processedEvent, null, 2));
    });

    return () => {
      taggingRegistry.delete(previewId);
    };
  }, [previewId, fn]);

  const boxClassNames = `flex-1 resize flex flex-col max-h-96 lg:max-h-full`;

  return (
    <FullScreenMode className="m-4">
      <div
        className="flex flex-row gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ height }}
      >
        <div className="w-1/3 flex-shrink-0 snap-start">
          <CodeBox
            label="HTML"
            value={htmlCode}
            onChange={setHtmlCode}
            showReset={true}
            onReset={() => {
              setHtmlCode(code.trim());
              resetTypewriter();
              setIsPaused(false);
            }}
            className={boxClassNames}
            typewriter={typewriter}
          />
        </div>

        <div className="w-1/3 flex-shrink-0 snap-start">
          <Preview
            code={htmlCode}
            previewId={previewId}
            boxClassNames={boxClassNames}
          />
        </div>

        <div className="w-1/3 flex-shrink-0 snap-start">
          <CodeBox
            label="Event"
            value={eventCode || 'No event yet.'}
            disabled={true}
            isConsole={true}
            className={boxClassNames}
            showReset={true}
            onReset={() => setEventCode('')}
          />
        </div>

        <div className="w-1/3 flex-shrink-0 snap-start">
          <CodeBox
            label="Mapping"
            value={`{
  "product": {
    "view": {
      "name": "product.name",
      "price": "product.price"
    }
  }
}`}
            onChange={() => {}}
            className={boxClassNames}
          />
        </div>

        <div className="w-1/3 flex-shrink-0 snap-start">
          <CodeBox
            label="Command"
            value={`{
  "event": "product view",
  "data": {
    "name": "Everyday Ruck Snack",
    "price": 2.50
  },
  "context": {
    "previewId": "preview"
  }
}`}
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
