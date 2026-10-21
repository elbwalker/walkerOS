import type { Destination, Settings } from './types';
import { StepError } from '@walkeros/core';
import { getConfig } from './config';
import { push } from './push';
import { pushBatch } from './pushBatch';
import { setup } from './setup';
import { openWriter, closeWriter } from './writer';

// Types
export * as DestinationBigQuery from './types';

// Timeout layering (who owns which bound):
// - The COLLECTOR bounds every delivery: it races each push/pushBatch at
//   config.timeout (default 10s, packages/collector/src/destination.ts) and
//   converts a hung delivery into a counted DLQ failure. That is the
//   per-operation protection.
// - This DESTINATION owns the connection lifecycle: broken-writer detection
//   via the connection 'error' listener, one lazy re-open on the next push
//   (ensureWriter), collapsed across concurrent pushes.
// - The gax deadline below bounds UNARY control-plane calls only (the
//   getWriteStream schema fetch during open/re-open). It is never applied to
//   the appendRows bidi stream: a deadline there bounds the stream's total
//   lifetime and would kill a healthy connection on expiry. The stream keeps
//   the SDK's own long-lived AppendRows default.
const DEFAULT_TIMEOUT_MS = 10_000;

export const destinationBigQuery: Destination = {
  type: 'gcp-bigquery',

  config: {},

  setup,

  async init({ config: partialConfig, env, logger, id, reportError }) {
    const config = getConfig(partialConfig, env, logger);

    // Deadline for unary control-plane calls, derived from the standard
    // per-step config.timeout (the same value the collector uses to race the
    // push). A positive number wins; 0/unset falls back to the default.
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
    // a re-open targets the same table with the same auth and unary-call
    // deadline.
    //
    // The same hook opens the writer at the first push, so init stays
    // offline: a missing dataset or table, or a failed connection, fails that
    // push with a StepError the collector reports.
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
          env,
        },
        logger,
      ).catch((err: unknown) => {
        throw openError(err, settings, id);
      });

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

/**
 * A failed writer open as a StepError: a missing dataset or table is a setup
 * step the operator has to run (not retryable), anything else a connection
 * failure. The SDK's own error stays the cause.
 */
function openError(err: unknown, settings: Settings, id: string): StepError {
  if (isNotFound(err))
    return new StepError(
      `BigQuery dataset or table not found: project="${settings.projectId}", ` +
        `target="${settings.datasetId}.${settings.tableId}". ` +
        `Run "walkeros setup destination.${id}" to create them.`,
      { code: 'config', cause: err },
    );
  return new StepError('BigQuery writer could not be opened', {
    code: 'transport',
    cause: err,
  });
}

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
