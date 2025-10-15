import { useState, useEffect, useCallback } from 'react';
import type { WalkerOS } from '@walkeros/core';
import { debounce, isString, tryCatchAsync } from '@walkeros/core';
import { CodePanel } from '../molecules/code-panel';
import { cn } from '@/lib/utils';

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
  showQuotes?: boolean;
  className?: string;
}

function formatValue(value: unknown, options: { quotes?: boolean } = {}) {
  if (value === undefined) return '';
  const str = isString(value) ? value : JSON.stringify(value, null, 2);
  return options.quotes && isString(value) ? `"${str}"` : str;
}

export function LiveCode({
  input: initInput,
  config: initConfig,
  output: initOutput = '',
  options,
  fn,
  fnName,
  labelInput = 'Event',
  labelConfig = 'Config',
  labelOutput = 'Result',
  emptyText = 'No event yet.',
  disableInput = false,
  disableConfig = false,
  showQuotes = true,
  className,
}: LiveCodeProps) {
  const [input, setInput] = useState(formatValue(initInput));
  const [config, setConfig] = useState(formatValue(initConfig));
  const [output, setOutput] = useState([formatValue(initOutput)]);

  const log = useCallback(
    (...args: unknown[]) => {
      const params = args
        .map((arg) => formatValue(arg, { quotes: showQuotes }))
        .join(', ');
      setOutput([fnName ? `${fnName}(${params})` : params]);
    },
    [fnName, showQuotes],
  );

  const updateOutput = useCallback(
    debounce(
      async (inputStr: string, configStr: string, opts: WalkerOS.AnyObject) => {
        if (!fn) return;
        setOutput([]);
        await tryCatchAsync(fn, (e) => {
          setOutput([`Error: ${String(e)}`]);
        })(inputStr, configStr, log, opts);
      },
      500,
      true,
    ),
    [fn, log],
  );

  useEffect(() => {
    updateOutput(input, config, options || {});
  }, [input, config, options, updateOutput]);

  return (
    <div className={cn('walkeros-explorer', className)}>
      <div className="explorer-grid">
        <CodePanel
          label={labelInput}
          value={input}
          onChange={disableInput ? undefined : setInput}
          disabled={disableInput}
          language="json"
        />

        {config && (
          <CodePanel
            label={labelConfig}
            value={config}
            onChange={disableConfig ? undefined : setConfig}
            disabled={disableConfig}
            language="json"
          />
        )}

        <CodePanel
          label={labelOutput}
          value={output[0] || emptyText}
          disabled
          language="json"
        />
      </div>
    </div>
  );
}
