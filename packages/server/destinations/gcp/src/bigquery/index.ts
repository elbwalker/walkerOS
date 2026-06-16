import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';
import { pushBatch } from './pushBatch';
import { setup } from './setup';
import { openWriter, closeWriter } from './writer';

// Types
export * as DestinationBigQuery from './types';

// Default gRPC deadline (ms) when the standard per-step `config.timeout` is
// unset or <= 0. Mirrors the collector's DEFAULT_DESTINATION_TIMEOUT_MS and its
// `> 0 ? value : default` rule (packages/collector/src/destination.ts), so the
// gax deadline matches the window the collector uses to race the push.
const DEFAULT_TIMEOUT_MS = 10_000;

export const destinationBigQuery: Destination = {
  type: 'gcp-bigquery',

  config: {},

  setup,

  async init({ config: partialConfig, env, logger, id }) {
    const config = getConfig(partialConfig, env, logger);

    // The gax deadline derives from the standard per-step config.timeout (the
    // same value the collector uses to race the push), not a destination-custom
    // knob. A positive number wins; 0/unset falls back to the default.
    const timeout =
      config.timeout && config.timeout > 0
        ? config.timeout
        : DEFAULT_TIMEOUT_MS;

    // Open the long-lived JSONWriter on the _default stream.
    // Hard-fail when the dataset/table is missing.
    try {
      const { writer, writeClient } = await openWriter(
        {
          projectId: config.settings.projectId,
          datasetId: config.settings.datasetId,
          tableId: config.settings.tableId,
          bigquery: config.settings.bigquery,
          timeout,
        },
        logger,
      );
      config.settings.writer = writer;
      config.settings.writeClient = writeClient;
    } catch (err) {
      // Log the failure and rethrow the raw error. Secret redaction is
      // standardized at the CLI logger handler, which scrubs every line before
      // both stderr and the heartbeat ring, so the destination logs the message
      // as-is. The raw error keeps its `code` naturally, so it stays
      // NotFound-classifiable and DLQ-routable.
      const message = err instanceof Error ? err.message : String(err);
      if (isNotFound(err)) {
        const target = `${config.settings.datasetId}.${config.settings.tableId}`;
        const project = config.settings.projectId;
        logger.error(
          `BigQuery dataset or table not found: project="${project}", target="${target}". ` +
            `Run "walkeros setup destination.${id}" to create them.`,
          {
            project,
            target,
            error: message,
          },
        );
      } else {
        // Catch-all so init failures are never silent. The destination is the
        // layer with the most context about what was attempted (open writer,
        // resolve stream, build proto descriptor), so it logs here before
        // re-throwing.
        logger.error('BigQuery init failed', {
          error: message,
        });
      }
      throw err;
    }

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  pushBatch,

  async destroy({ config, logger }) {
    if (!config.settings) return;
    closeWriter(
      {
        writer: config.settings.writer,
        writeClient: config.settings.writeClient,
      },
      logger,
    );
  },
};

// Type predicate for NOT_FOUND-class errors. The Storage Write API surfaces
// missing datasets/tables as gRPC code 5 (NOT_FOUND) or HTTP 404.
function isNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  const obj: { code?: unknown } = err;
  // gRPC NOT_FOUND = 5; REST = 404
  return obj.code === 5 || obj.code === 404;
}

export default destinationBigQuery;
