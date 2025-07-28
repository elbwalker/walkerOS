import type { WalkerOS } from '@walkeros/core';
import { useEffect, useState, useRef, memo } from 'react';
import { debounce, isString, tryCatchAsync } from '@walkeros/core';
import CodeBox, { formatValue } from '@site/src/components/molecules/codeBox';
import FullScreenMode from '@site/src/components/organisms/fullScreenMode';

export interface CollectorConfigurationProps {
  configuration: unknown;
  javascript?: unknown;
  result?: unknown;
  fn?: (
    configuration: unknown,
    log: (...args: unknown[]) => void,
  ) => Promise<unknown>;
  labelConfiguration?: string;
  labelJavaScript?: string;
  labelResult?: string;
  emptyText?: string;
  disableConfiguration?: boolean;
  disableJavaScript?: boolean;
  height?: number;
  smallText?: boolean;
  className?: string;
}

export const CollectorConfiguration: React.FC<CollectorConfigurationProps> =
  memo(
    ({
      configuration: initConfiguration,
      javascript: initJavaScript,
      result: initResult = '',
      fn,
      labelConfiguration = 'Configuration',
      labelJavaScript = 'JavaScript',
      labelResult = 'Result',
      emptyText = 'No result yet.',
      disableConfiguration = false,
      disableJavaScript = false,
      height,
      smallText,
      className,
    }) => {
      const [configuration, setConfiguration] = useState(
        isString(initConfiguration)
          ? initConfiguration
          : formatValue(initConfiguration),
      );
      const [javascript, setJavaScript] = useState(
        isString(initJavaScript) ? initJavaScript : formatValue(initJavaScript),
      );
      const [result, setResult] = useState([
        isString(initResult) ? initResult : formatValue(initResult),
      ]);

      const log = useRef((...args: unknown[]) => {
        const params = args
          .map((arg) => formatValue(arg, { quotes: true }))
          .join(', ');

        setResult([params]);
      }).current;

      const updateResult = useRef(
        debounce(
          async (configStr: string) => {
            if (!fn) return;

            setResult([]);

            try {
              const result = await tryCatchAsync(fn, (e) => {
                setResult([`Configuration error: ${String(e)}`]);
              })(configStr, log);

              if (result !== undefined) {
                setResult([formatValue(result)]);
              }
            } catch (error) {
              setResult([`Execution error: ${String(error)}`]);
            }
          },
          500,
          true,
        ),
      ).current;

      useEffect(() => {
        updateResult(configuration);
      }, [configuration]);

      const boxClassNames = `flex-1 resize flex flex-col max-h-96 xl:max-h-full ${className || ''}`;

      const renderCodeBoxes = (isFullScreenMode = false) => (
        <div
          className={`flex flex-col xl:flex-row gap-2 scroll ${
            isFullScreenMode ? 'h-full' : ''
          }`}
          style={
            height && { height: isFullScreenMode ? undefined : `${height}` }
          }
        >
          <CodeBox
            label={labelConfiguration}
            disabled={disableConfiguration}
            value={configuration}
            onChange={setConfiguration}
            className={boxClassNames}
            smallText={isFullScreenMode ? false : smallText}
            language="javascript"
          />

          {javascript && (
            <CodeBox
              label={labelJavaScript}
              disabled={disableJavaScript}
              value={javascript}
              onChange={setJavaScript}
              className={boxClassNames}
              smallText={isFullScreenMode ? false : smallText}
              language="javascript"
            />
          )}

          <CodeBox
            label={labelResult}
            value={result[0] || emptyText}
            className={boxClassNames}
            smallText={isFullScreenMode ? false : smallText}
            language="javascript"
          />
        </div>
      );

      return (
        <FullScreenMode className="collector-configuration mb-4">
          {renderCodeBoxes()}
        </FullScreenMode>
      );
    },
  );

export default CollectorConfiguration;
