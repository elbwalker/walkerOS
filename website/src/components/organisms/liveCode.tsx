import type { WalkerOS } from '@walkeros/core';
import { useEffect, useState, useRef, memo } from 'react';
import { debounce, isString, tryCatchAsync } from '@walkeros/core';
import CodeBox, { formatValue } from '@site/src/components/molecules/codeBox';
import FullScreenMode from '@site/src/components/organisms/fullScreenMode';

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
  ) => Promise<void>;
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
    const [output, setOutput] = useState([
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
        async (
          inputStr: string,
          configStr: string,
          options: WalkerOS.AnyObject,
        ) => {
          if (!fn) return;

          setOutput([]);

          await tryCatchAsync(fn, (e) => {
            setOutput([`Preview error: ${String(e)}`]);
          })(inputStr, configStr, log, options);
        },
        500,
        true,
      ),
    ).current;

    useEffect(() => {
      updateRight(input, config, options);
    }, [input, config, options]);

    const boxClassNames = `flex-1 resize flex flex-col ${isFullScreen ? 'max-h-[calc(100vh-12rem)]' : 'max-h-96 xl:max-h-full'} ${className}`;

    const renderCodeBoxes = (isFullScreenMode = false) => (
      <div
        className={`flex flex-col xl:flex-row gap-2 scroll ${
          isFullScreenMode ? 'h-full' : ''
        }`}
        style={height && { height: isFullScreenMode ? undefined : `${height}` }}
      >
        <CodeBox
          label={labelInput}
          disabled={disableInput}
          value={input}
          onChange={setInput}
          className={boxClassNames}
          smallText={isFullScreenMode ? false : smallText}
        />

        {config && (
          <CodeBox
            label={labelConfig}
            disabled={disableConfig}
            value={config}
            onChange={setConfig}
            className={boxClassNames}
            smallText={isFullScreenMode ? false : smallText}
          />
        )}

        <CodeBox
          label={labelOutput}
          value={output[0] || emptyText}
          className={boxClassNames}
          smallText={isFullScreenMode ? false : smallText}
        />
      </div>
    );

    return (
      <FullScreenMode className="live-code mb-4">
        {renderCodeBoxes()}
      </FullScreenMode>
    );
  },
);

export default LiveCode;
