import type { WalkerOS } from '@elbwalker/types';
import { useEffect, useState, useRef, memo } from 'react';
import { debounce } from '@elbwalker/utils';
import CodeBox, { formatValue } from '../molecules/codeBox';

interface LiveCodeProps {
  input: string;
  config?: string;
  output?: string;
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
    disableInput = false,
    disableConfig = false,
    height,
    smallText,
    className,
  }) => {
    const [input, setInput] = useState(initInput);
    const [config, setConfig] = useState(initConfig);
    const [output, setOutput] = useState<string[]>([initOutput]);

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

    return (
      <div className="my-4">
        <div className={`flex flex-col xl:flex-row gap-2 scroll`}>
          <CodeBox
            label={labelInput}
            disabled={disableInput}
            value={input}
            onChange={setInput}
            className={boxClassNames}
            height={height}
            smallText={smallText}
          />

          {config && (
            <CodeBox
              label={labelConfig}
              disabled={disableConfig}
              value={config}
              onChange={setConfig}
              className={boxClassNames}
              height={height}
              smallText={smallText}
            />
          )}

          <CodeBox
            label={labelOutput}
            value={output[0] || 'No event yet.'}
            className={boxClassNames}
            height={height}
            smallText={smallText}
          />
        </div>
      </div>
    );
  },
);

export default LiveCode;
