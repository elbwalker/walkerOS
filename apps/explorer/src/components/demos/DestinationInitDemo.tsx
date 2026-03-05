import React, { useState, useCallback, useEffect } from 'react';
import type { Destination } from '@walkeros/core';
import { tryCatchAsync } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { CodeBox } from '../molecules/code-box';
import { Grid } from '../atoms/grid';
import { captureDestinationInit } from '../../helpers/capture';

export interface DestinationInitDemoProps {
  destination: Destination.Instance;
  settings?: unknown;
  labelSettings?: string;
  labelOutput?: string;
}

/**
 * DestinationInitDemo - Interactive destination initialization testing component
 *
 * Automatically captures destination.init() calls and displays the output.
 * The component auto-detects the destination's env from destination.examples.env.init.
 *
 * Props:
 * - destination: Destination instance with examples.env.init export
 * - settings: Initial destination-specific settings
 * - labelSettings: Label for settings panel (default: 'Settings')
 * - labelOutput: Label for output panel (default: 'Result')
 *
 * Example:
 * ```tsx
 * import destinationGtag from '@walkeros/web-destination-gtag';
 * import { examples } from '@walkeros/web-destination-gtag';
 *
 * const destination = { ...destinationGtag, examples };
 *
 * <DestinationInitDemo
 *   destination={destination}
 *   settings={{ ga4: { measurementId: 'G-XXXXXXXXXX' } }}
 * />
 * ```
 */
export function DestinationInitDemo({
  destination,
  settings: initialSettings = {},
  labelSettings = 'Settings',
  labelOutput = 'Result',
}: DestinationInitDemoProps) {
  const [settingsInput, setSettingsInput] = useState(
    typeof initialSettings === 'string'
      ? initialSettings
      : JSON.stringify(initialSettings, null, 2),
  );
  const [output, setOutput] = useState('');

  const executeInit = useCallback(async () => {
    await tryCatchAsync(
      async () => {
        const settingsData = JSON.parse(settingsInput);

        // Build config
        const config: Destination.Config = {
          settings: settingsData,
        };

        // Create minimal collector
        const { collector } = await startFlow({});

        // Build context for destination.init()
        const context: Destination.Context = {
          id: 'demo',
          collector,
          config,
          env: destination.env || {},
          logger: collector.logger,
        };

        if (!destination.init) {
          setOutput('No init method defined for this destination');
          return;
        }

        // Auto-detect destination.examples.env.init (for init method)
        const destinationEnv = (
          destination as { examples?: { env?: { init?: unknown } } }
        ).examples?.env?.init;

        // Use captureDestinationInit to automatically capture output
        const captureFn = captureDestinationInit(destination, destinationEnv);
        const result = await captureFn(context);
        setOutput(result);
      },
      (error) => setOutput(`Error: ${error}`),
    )();
  }, [settingsInput, destination]);

  useEffect(() => {
    const timeoutId = setTimeout(executeInit, 500);
    return () => clearTimeout(timeoutId);
  }, [executeInit]);

  return (
    <Grid columns={2} rowHeight="synced">
      <CodeBox
        label={labelSettings}
        code={settingsInput}
        onChange={setSettingsInput}
        language="json"
        showFormat
        autoHeight
      />
      <CodeBox
        label={labelOutput}
        code={output}
        disabled
        language="javascript"
        autoHeight
      />
    </Grid>
  );
}
