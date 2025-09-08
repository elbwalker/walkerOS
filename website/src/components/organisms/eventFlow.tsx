import { FC, useCallback, useEffect, useRef, useState } from 'react';
import type { WalkerOS, Mapping } from '@walkeros/core';
import CodeBox, { formatValue } from '@site/src/components/molecules/codeBox';
import Preview from '@site/src/components/molecules/preview';
import { parseInput } from '@site/src/components/molecules/codeBox';
import '@site/src/css/highlighting.scss';
import {
  debounce,
  isString,
  tryCatchAsync,
  getMappingValue,
} from '@walkeros/core';
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

  const scroll = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { clientHeight, clientWidth } = scrollContainerRef.current;
      const scrollAmount = isVertical ? clientHeight * 0.8 : clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        top:
          isVertical && direction === 'up'
            ? -scrollAmount
            : isVertical && direction === 'down'
              ? scrollAmount
              : 0,
        left:
          !isVertical && direction === 'left'
            ? -scrollAmount
            : !isVertical && direction === 'right'
              ? scrollAmount
              : 0,
        behavior: 'smooth',
      });
    }
  };

  const createResult = useRef(
    debounce(async (eventStr: string, mappingStr: string) => {
      tryCatchAsync(
        async () => {
          if (!eventStr) return;

          const event = (await parseInput(eventStr)) as WalkerOS.Event;
          const mappingConfig = (await parseInput(
            mappingStr,
          )) as Mapping.Config;

          // Find the mapping rule for this event
          let mappingRule: Mapping.Rule | undefined;
          let transformedData: unknown = event;

          if (mappingConfig) {
            // Check for entity-action specific mapping
            const entityMappings = mappingConfig[event.entity];
            if (entityMappings) {
              mappingRule = entityMappings[event.action] || entityMappings['*'];
            }

            // Check for wildcard entity mapping
            if (!mappingRule && mappingConfig['*']) {
              mappingRule =
                mappingConfig['*'][event.action] || mappingConfig['*']['*'];
            }

            // Apply mapping transformation if found
            if (mappingRule) {
              // Handle array of rules (conditional mappings)
              if (Array.isArray(mappingRule)) {
                for (const rule of mappingRule) {
                  if (!rule.condition || rule.condition(event)) {
                    mappingRule = rule;
                    break;
                  }
                }
              }

              // Apply data transformation
              if (
                mappingRule &&
                !Array.isArray(mappingRule) &&
                mappingRule.data
              ) {
                transformedData = await getMappingValue(
                  event,
                  mappingRule.data,
                  {
                    collector: { id: 'playground' } as any,
                  },
                );
              } else {
                transformedData = event;
              }

              // Apply name transformation
              if (
                mappingRule &&
                !Array.isArray(mappingRule) &&
                mappingRule.name
              ) {
                event.name = mappingRule.name;
              }
            }
          }

          const value = transformedData || event;
          setResultCode(formatValue(resultFn ? resultFn(value) : value));
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
    const scrollContainer = scrollContainerRef.current;

    const handleScroll = () => {
      if (scrollContainer) {
        const {
          scrollTop,
          scrollHeight,
          clientHeight,
          scrollLeft,
          scrollWidth,
          clientWidth,
        } = scrollContainer;
        const vertical = window.innerWidth < 1024;
        setIsVertical(vertical);
        if (vertical) {
          setIsScrollStart(scrollTop === 0);
          setIsScrollEnd(scrollTop + clientHeight >= scrollHeight - 1);
        } else {
          setIsScrollStart(scrollLeft === 0);
          setIsScrollEnd(scrollLeft + clientWidth >= scrollWidth - 1);
        }
      }
    };

    if (scrollContainer) {
      handleScroll(); // Initial check
      scrollContainer.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, []);

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
