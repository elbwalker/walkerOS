import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { WalkerOS } from '@walkeros/core';
import {
  debounce,
  getErrorMessage,
  isString,
  tryCatchAsync,
} from '@walkeros/core';
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
  /** Plain words in the empty Result box, such as why a run returns nothing. */
  emptyText?: string;
  disableInput?: boolean;
  disableConfig?: boolean;
  showQuotes?: boolean;
  className?: string;
  language?: string;
  format?: boolean;
  rowHeight?: 'auto' | 'equal' | 'synced' | number;
  /** Language for the Result panel. Defaults to json (the typical output
   * shape). */
  outputLanguage?: string;
  /** Language for the Config panel. Defaults to `json`. Override when the
   * Config panel content is not JSON. */
  configLanguage?: string;
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
  outputLanguage = 'json',
  configLanguage = 'json',
}: LiveCodeProps) {
  const [input, setInput] = useState(formatValue(initInput));
  const [config, setConfig] = useState(formatValue(initConfig));
  const [output, setOutput] = useState([formatValue(initOutput)]);
  const [error, setError] = useState<string>();

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

  // One logged call, as the Result box shows it.
  const formatLog = useCallback(
    (args: unknown[]) => {
      const params = args
        .map((arg) => formatValue(arg, { quotes: showQuotes }))
        .join(', ');
      return fnName ? `${fnName}(${params})` : params;
    },
    [fnName, showQuotes],
  );

  // The latest run; a log of an older one shows nothing.
  const runRef = useRef(0);

  // A run's result replaces the last one when the run ends, so the box never
  // empties between runs; a failed run shows its error alone. A log that
  // arrives after its run resolved still shows, as the latest call.
  const updateOutput = useCallback(
    debounce(
      async (inputStr: string, configStr: string, opts: WalkerOS.AnyObject) => {
        if (!fn) return;
        const run = ++runRef.current;
        const logged: string[] = [];
        const failures: string[] = [];
        let ended = false;
        await tryCatchAsync(fn, (e) => {
          failures.push(getErrorMessage(e));
        })(
          inputStr,
          configStr,
          (...args: unknown[]) => {
            const line = formatLog(args);
            if (!ended) logged.push(line);
            else if (run === runRef.current) setOutput([line]);
          },
          opts,
        );
        ended = true;
        if (run !== runRef.current) return;
        setOutput(failures.length ? [] : logged.slice(-1));
        setError(failures[0]);
      },
      500,
      true,
    ),
    [fn, formatLog],
  );

  useEffect(() => {
    updateOutput(input, config, options || {});
  }, [input, config, options, updateOutput]);

  return (
    <Grid columns={config ? 3 : 2} className={className} rowHeight={rowHeight}>
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
          language={configLanguage}
          showFormat={!disableConfig && configLanguage === 'json'}
        />
      )}

      <CodeBox
        label={labelOutput}
        code={output[0] || ''}
        disabled
        language={outputLanguage}
        placeholder={emptyText}
        error={error}
      />
    </Grid>
  );
}
