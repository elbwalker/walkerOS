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

  async init({ config: partialConfig, env, logger, id, reportError }) {
    const config = getConfig(partialConfig, env, logger);

    // The gax deadline derives from the standard per-step config.timeout (the
    // same value the collector uses to race the push), not a destination-custom
    // knob. A positive number wins; 0/unset falls back to the default.
    const timeout =
      config.timeout && config.timeout > 0
        ? config.timeout
        : DEFAULT_TIMEOUT_MS;

    const { settings } = config;

    // Handler for the StreamConnection's out-of-band `'error'` event. Attaching
    // it prevents Node's uncaught-`'error'` crash on the detached gRPC tick. It
    // flags the writer broken (so the next push self-heals or DLQs in-band) and
    // routes the error through the Task-2 ORPHAN reportError seam (no event):
    // a redacted, ring-tapped log plus a connection-error counter bump. MUST
    // NOT throw (detached emitter tick).
    const onConnectionError = (err: unknown): void => {
      settings.writerBroken = true;
      settings.lastStreamError =
        err instanceof Error ? err : new Error(String(err));
      reportError?.(err);
    };

    // Lazy re-open hook used by ensureWriter on the push path to self-heal a
    // broken writer. Closes over the openWriter args + onConnectionError so the
    // fresh connection carries the same containment handler. The reused args
    // (projectId/datasetId/tableId/bigquery/timeout) are immutable post-init, so
    // a re-open targets the same table with the same auth and deadline.
    settings.reopenWriter = () =>
      openWriter(
        {
          projectId: settings.projectId,
          datasetId: settings.datasetId,
          tableId: settings.tableId,
          credentials: settings.credentials,
          bigquery: settings.bigquery,
          timeout,
          onConnectionError,
        },
        logger,
      );

    // Open the long-lived JSONWriter on the _default stream.
    // Hard-fail when the dataset/table is missing.
    try {
      const { writer, writeClient, connection, connectionErrorListener } =
        await openWriter(
          {
            projectId: settings.projectId,
            datasetId: settings.datasetId,
            tableId: settings.tableId,
            credentials: settings.credentials,
            bigquery: settings.bigquery,
            timeout,
            onConnectionError,
          },
          logger,
        );
      settings.writer = writer;
      settings.writeClient = writeClient;
      settings.connection = connection;
      settings.connectionErrorListener = connectionErrorListener;
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
        connectionErrorListener: config.settings.connectionErrorListener,
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
