import { useState, useEffect, useCallback } from 'react';
import type { WalkerOS } from '@walkeros/core';
import { debounce, isString, tryCatchAsync } from '@walkeros/core';
import { CodeBox } from '../molecules/code-box';
import { Grid } from '../atoms/grid';
import { cn } from '../../lib/utils';
import { formatCode } from '../../utils/format-code';

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
  language?: string;
  format?: boolean;
  rowHeight?: 'auto' | 'equal' | 'synced' | number;
}

function formatValue(value: unknown, options: { quotes?: boolean } = {}) {
  if (value === undefined) return '';
  const str = isString(value) ? value.trim() : JSON.stringify(value, null, 2);
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
  language = 'json',
  format = true,
  rowHeight,
}: LiveCodeProps) {
  const [input, setInput] = useState(formatValue(initInput));
  const [config, setConfig] = useState(formatValue(initConfig));
  const [output, setOutput] = useState([formatValue(initOutput)]);

  // Format input code on mount
  useEffect(() => {
    if (format && initInput) {
      const rawInput = formatValue(initInput);
      formatCode(rawInput, language).then(setInput);
    }
  }, [initInput, language, format]);

  // Format config code on mount
  useEffect(() => {
    if (format && initConfig) {
      const rawConfig = formatValue(initConfig);
      formatCode(rawConfig, language).then(setConfig);
    }
  }, [initConfig, language, format]);

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
    <Grid columns={3} className={className} rowHeight={rowHeight}>
      <CodeBox
        label={labelInput}
        code={input}
        onChange={disableInput ? undefined : setInput}
        disabled={disableInput}
        language={language}
        showFormat={!disableInput && language === 'json'}
      />

      {config && (
        <CodeBox
          label={labelConfig}
          code={config}
          onChange={disableConfig ? undefined : setConfig}
          disabled={disableConfig}
          language={language}
          showFormat={!disableConfig && language === 'json'}
        />
      )}

      <CodeBox
        label={labelOutput}
        code={output[0] || emptyText}
        disabled
        language={language}
      />
    </Grid>
  );
}
