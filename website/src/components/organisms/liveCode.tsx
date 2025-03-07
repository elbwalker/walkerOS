import type { WalkerOS } from '@elbwalker/types';
import { useEffect, useState, useRef, memo } from 'react';
import { debounce, isString } from '@elbwalker/utils';
import CodeBox, { formatValue } from '../molecules/codeBox';
import FullScreenOverlay from '../molecules/codeBoxOverlay';

export interface LiveCodeProps {
  input: unknown;
  config?: unknown;
  output?: unknown;
  options?: WalkerOS.AnyObject;
  fn?: (
    input: unknown,
    config: unknown,
    log: (...args: unknown[]) => void,
    options?: WalkerOS.AnyObject,
  ) => void;
  fnName?: string;
  labelInput?: string;
  labelConfig?: string;
  labelOutput?: string;
  emptyText?: string;
  disableInput?: boolean;
  disableConfig?: boolean;
  showMiddle?: boolean;
  height?: number;
  smallText?: boolean;
  className?: string;
}

export const LiveCode: React.FC<LiveCodeProps> = memo(
  ({
    input: initInput,
    config: initConfig,
    output: initOutput = '',
    options,
    fn,
    fnName,
    labelInput = 'Event',
    labelConfig = 'Custom Config',
    labelOutput = 'Result',
    emptyText = 'No event yet.',
    disableInput = false,
    disableConfig = false,
    height,
    smallText,
    className,
  }) => {
    const [input, setInput] = useState(
      isString(initInput) ? initInput : formatValue(initInput),
    );
    const [config, setConfig] = useState(
      isString(initConfig) ? initConfig : formatValue(initConfig),
    );
    const [output, setOutput] = useState<string[]>([
      isString(initOutput) ? initOutput : formatValue(initOutput),
    ]);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const log = useRef((...args: unknown[]) => {
      const params = args
        .map((arg) => formatValue(arg, { quotes: true }))
        .join(', ');

      setOutput([fnName ? `${fnName}(${params})` : params]);
    }).current;

    const updateRight = useRef(
      debounce(
        (inputStr: string, configStr: string, options: WalkerOS.AnyObject) => {
          if (!fn) return;

          setOutput([]);

          try {
            fn(inputStr, configStr, log, options);
          } catch (e) {
            setOutput([`Preview error: ${String(e)}`]);
          }
        },
        500,
        true,
      ),
    ).current;

    useEffect(() => {
      updateRight(input, config, options);
    }, [input, config, options]);

    const boxClassNames = `flex-1 resize max-h-96 xl:max-h-full flex flex-col ${className}`;

    const renderCodeBoxes = (isFullScreenMode = false) => (
      <div
        className={`flex flex-col xl:flex-row gap-2 scroll ${
          isFullScreenMode ? 'h-full' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <CodeBox
          label={labelInput}
          disabled={disableInput}
          value={input}
          onChange={setInput}
          className={boxClassNames}
          height={isFullScreenMode ? undefined : height}
          smallText={isFullScreenMode ? false : smallText}
        />

        {config && (
          <CodeBox
            label={labelConfig}
            disabled={disableConfig}
            value={config}
            onChange={setConfig}
            className={boxClassNames}
            height={isFullScreenMode ? undefined : height}
            smallText={isFullScreenMode ? false : smallText}
          />
        )}

        <CodeBox
          label={labelOutput}
          value={output[0] || emptyText}
          className={boxClassNames}
          height={isFullScreenMode ? undefined : height}
          smallText={isFullScreenMode ? false : smallText}
        />
      </div>
    );

    return (
      <div className="live-code">
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <button
              className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors border-none bg-transparent"
              onClick={() => setIsFullScreen(true)}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              Full screen
            </button>
          </div>
          {renderCodeBoxes()}
        </div>
        <FullScreenOverlay
          isOpen={isFullScreen}
          onClose={() => setIsFullScreen(false)}
        >
          {renderCodeBoxes(true)}
        </FullScreenOverlay>
      </div>
    );
  },
);

export default LiveCode;
