import { FC, useCallback, useEffect, useRef, useState } from 'react';
import type { Mapping, WalkerOS } from '@elbwalker/types';
import CodeBox, { formatValue } from '@site/src/components/molecules/codeBox';
import Preview from '@site/src/components/molecules/preview';
import { parseInput } from '@site/src/components/molecules/codeBox';
import '@site/src/css/highlighting.scss';
import {
  destinationPush,
  debounce,
  isString,
  tryCatchAsync,
} from '@elbwalker/utils';
import { taggingRegistry } from './tagging';

export interface EventFlowProps {
  code: string;
  mapping?: string | Mapping.Config;
  height?: string;
  previewId?: string;
  eventFn?: (event: WalkerOS.Event) => WalkerOS.Event;
  resultFn?: (output: unknown) => string;
  width?: string;
}

const EventFlow: FC<EventFlowProps> = ({
  code,
  mapping,
  height = '400px',
  previewId = 'preview',
  eventFn,
  resultFn,
  width = 'w-full lg:w-1/4',
}) => {
  const [htmlCode, setHtmlCode] = useState(code.trim());
  const [eventCode, setEventCode] = useState<string>(undefined);
  const [mappingCode, setMappingCode] = useState<string | undefined>(
    isString(mapping) ? mapping : formatValue(mapping),
  );
  const [resultCode, setResultCode] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrollStart, setIsScrollStart] = useState(true);
  const [isScrollEnd, setIsScrollEnd] = useState(false);
  const [isVertical, setIsVertical] = useState(false);

  const handleResize = () => {
    setIsVertical(window.innerWidth < 1024);
  };

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

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      if (isVertical) {
        setIsScrollStart(scrollTop === 0);
        setIsScrollEnd(scrollTop + clientHeight >= scrollHeight - 1);
      } else {
        setIsScrollStart(scrollLeft === 0);
        setIsScrollEnd(scrollLeft + clientWidth >= scrollWidth - 1);
      }
    }
  };

  const scroll = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { clientHeight, clientWidth } = scrollContainerRef.current;
      if (isVertical) {
        const scrollAmount = clientHeight * 0.8;
        scrollContainerRef.current.scrollBy({
          top: direction === 'up' ? -scrollAmount : scrollAmount,
          behavior: 'smooth',
        });
      } else {
        const scrollAmount = clientWidth * 0.8;
        scrollContainerRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth',
        });
      }
    }
  };

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

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      handleScroll(); // Initial check
      scrollContainer.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isVertical]);

  const boxClassNames = `flex-1 resize flex flex-col max-h-96 lg:max-h-full`;

  return (
      <div className="relative h-full m-4">
        {!isScrollStart && (
          <button
            onClick={() => scroll(isVertical ? 'up' : 'left')}
            className={`absolute z-10 bg-gray-700 bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full ${
              isVertical
                ? 'top-0 left-1/2 -translate-x-1/2'
                : 'left-0 top-1/2 -translate-y-1/2'
            }`}
          >
            {isVertical ? '↑' : '←'}
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className="flex lg:flex-row flex-col gap-4 overflow-auto scrollbar-hide h-full"
          style={{ height }}
        >
          <div className={`${width} flex-shrink-0 flex flex-col`}>
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

          <div className={`${width} flex-shrink-0 flex flex-col`}>
            <Preview
              code={htmlCode}
              previewId={previewId}
              boxClassNames={boxClassNames}
            />
          </div>

          <div className={`${width} flex-shrink-0 flex flex-col`}>
            <CodeBox
              label="Event"
              value={eventCode || 'No event yet.'}
              onChange={setEventCode}
              isConsole={true}
              className={boxClassNames}
            />
          </div>

          <div className={`${width} flex-shrink-0 flex flex-col`}>
            <CodeBox
              label="Mapping"
              value={formatValue(mappingCode)}
              onChange={setMappingCode}
              className={boxClassNames}
            />
          </div>

          <div className={`${width} flex-shrink-0 flex flex-col`}>
            <CodeBox
              label="Result"
              value={resultCode || 'No result yet.'}
              disabled={true}
              isConsole={true}
              className={boxClassNames}
            />
          </div>
        </div>
        {!isScrollEnd && (
          <button
            onClick={() => scroll(isVertical ? 'down' : 'right')}
            className={`absolute z-10 bg-gray-700 bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full ${
              isVertical
                ? 'bottom-0 left-1/2 -translate-x-1/2'
                : 'right-0 top-1/2 -translate-y-1/2'
            }`}
          >
            {isVertical ? '↓' : '→'}
          </button>
        )}
      </div>
  );
};

export default EventFlow;