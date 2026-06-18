import type { Logger, ServiceAccount } from '@walkeros/core';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import { managedwriter, adapt, protos } from '@google-cloud/bigquery-storage';

// gax CallOptions, derived from the SDK's own method signature so we don't take
// a direct dependency on `google-gax` (a transitive dep of bigquery-storage).
// `getWriteStream(request, options?: CallOptions)` -> the optional 2nd param.
type CallOptions = NonNullable<
  Parameters<managedwriter.WriterClient['getWriteStream']>[1]
>;

// The StreamConnection instance returned by createStreamConnection. It is an
// EventEmitter, so it exposes the typed `onConnectionError` hook we attach to
// (and the bare `on('error', …)` it inherits). Derived from the SDK method
// signature so we don't import the un-exported StreamConnection class.
export type StreamConnection = Awaited<
  ReturnType<managedwriter.WriterClient['createStreamConnection']>
>;

// The `{ off }` disposable returned by onConnectionError, used to remove the
// listener in closeWriter. Derived from the method's return type (not exported
// from the package root).
export type RemoveListener = ReturnType<StreamConnection['onConnectionError']>;

export interface OpenWriterArgs {
  projectId: string;
  datasetId: string;
  tableId: string;
  /**
   * Service-account credentials resolved from `config.credentials`. Forwarded
   * to the data-plane WriterClient so event writes authenticate with the
   * configured SA instead of falling back to ADC (which has no metadata server
   * to query on non-GCP runtimes, e.g. Scaleway). When both this and a
   * `settings.bigquery.credentials` are set, `config.credentials` wins, matching
   * the query client's resolution in getConfig, so one destination always
   * authenticates as a single identity across both clients.
   */
  credentials?: ServiceAccount;
  // Raw passthrough auth/client options for the WriterClient (the escape hatch).
  bigquery?: BigQueryOptions;
  /**
   * gRPC deadline in milliseconds, derived from the standard per-step
   * `config.timeout`. Applied as the gax `CallOptions.timeout` on the appendRows
   * bidi stream (via createStreamConnection) and the unary getWriteStream schema
   * fetch, so a hanging call is cancelled by gRPC and rejects instead of running
   * detached.
   */
  timeout?: number;
  /**
   * Handler for the connection's out-of-band `'error'` event. Attaching it (by
   * mere presence) prevents Node's uncaught-`'error'` throw on the detached
   * gRPC tick that crashed the process; the destination wires it to flag the
   * writer broken and route the error through `context.reportError`. MUST NOT
   * throw (it runs on a detached emitter tick).
   */
  onConnectionError?: (err: unknown) => void;
}

export interface WriterHandles {
  writeClient: managedwriter.WriterClient;
  writer: managedwriter.JSONWriter;
  // The StreamConnection the writer appends to. Held so closeWriter can remove
  // the connection-error listener it owns.
  connection: StreamConnection;
  // The `{ off }` disposable for the connection-error listener, removed in
  // closeWriter so a re-opened writer doesn't accumulate stale listeners.
  connectionErrorListener?: RemoveListener;
}

/**
 * Open a long-lived JSONWriter on the table's _default stream.
 * Requires the dataset and table to already exist (run `walkeros setup` first).
 *
 * Sequence (per SDK docs and empirical SDK probe):
 *   1. new WriterClient
 *   2. createStreamConnection
 *   3. attach the connection-error listener (so a detached stream `'error'`
 *      is contained instead of crashing the process)
 *   4. getWriteStream(view: FULL) to retrieve the table schema
 *   5. adapt.convertStorageSchemaToProto2Descriptor → protoDescriptor
 *   6. new JSONWriter({ connection, protoDescriptor })
 */
export async function openWriter(
  args: OpenWriterArgs,
  logger: Logger.Instance,
): Promise<WriterHandles> {
  const {
    projectId,
    datasetId,
    tableId,
    credentials,
    bigquery,
    timeout,
    onConnectionError,
  } = args;
  const destinationTable = `projects/${projectId}/datasets/${datasetId}/tables/${tableId}`;

  logger.debug('Opening BigQuery Storage Write API writer', {
    destinationTable,
  });

  // gax call options carrying the per-request deadline. The StreamConnection
  // stores these and applies them to the underlying appendRows bidi stream, so
  // every appendRows/getResult on this writer inherits the deadline. When the
  // deadline fires, gRPC cancels the call and getResult() rejects (no detached
  // promise). Left undefined when no timeout is configured.
  const callOptions: CallOptions | undefined =
    timeout === undefined ? undefined : { timeout };

  // The WriterClient takes google-gax ClientOptions, which extend
  // GoogleAuthOptions: `projectId` + `credentials` (a JWTInput, i.e.
  // { client_email, private_key, ... }), the same auth surface as
  // BigQueryOptions on the query client. Spread the resolved `config.credentials`
  // last so it wins over any `settings.bigquery.credentials`, mirroring the query
  // client's resolution in getConfig (one identity per destination).
  const writeClient = new managedwriter.WriterClient({
    projectId,
    ...bigquery,
    ...(credentials !== undefined ? { credentials } : {}),
  });
  let connectionErrorListener: RemoveListener | undefined;
  let connection: StreamConnection | undefined;
  try {
    // Use streamId (not streamType) so the SDK resolves to the table's
    // implicit `_default` stream without calling CreateWriteStream. Passing
    // managedwriter.DefaultStream as streamType triggers a CreateWriteStream
    // call with type='DEFAULT', which BQ rejects as TYPE_UNSPECIFIED.
    connection = await writeClient.createStreamConnection(
      {
        destinationTable,
        streamId: managedwriter.DefaultStream,
      },
      callOptions,
    );

    // Attach the connection-error listener on the StreamConnection (NOT the
    // inner gRPC `_connection`) BEFORE building the JSONWriter, so any `'error'`
    // the connection emits has a listener from the first tick onward. Without a
    // listener, Node throws the emitted error as an uncaughtException on a
    // detached tick, bypassing the collector's promise-path try/catch (the
    // crash this handler exists to prevent). `onConnectionError` is the SDK's
    // documented surface and returns an `{ off }` disposable; it adds an
    // `'error'` listener under the hood.
    if (onConnectionError) {
      connectionErrorListener = connection.onConnectionError((err) => {
        onConnectionError(err);
      });
    }

    const streamId = connection.getStreamId();
    const writeStream = await writeClient.getWriteStream(
      {
        streamId,
        view: protos.google.cloud.bigquery.storage.v1.WriteStreamView.FULL,
      },
      callOptions,
    );
    if (!writeStream.tableSchema) {
      throw new Error(
        `BigQuery write stream ${streamId} returned no tableSchema; cannot build proto descriptor`,
      );
    }
    const protoDescriptor = adapt.convertStorageSchemaToProto2Descriptor(
      writeStream.tableSchema,
      'root',
    );
    const writer = new managedwriter.JSONWriter({
      connection,
      protoDescriptor,
    });

    return { writeClient, writer, connection, connectionErrorListener };
  } catch (err) {
    // Release any resources already opened by the partial init so we don't
    // leak gRPC handles (including the connection-error listener). closeWriter
    // swallows close errors and only logs.
    closeWriter({ writeClient, connectionErrorListener }, logger);
    throw err;
  }
}

// Structural subset of Settings that ensureWriter reads/writes. Kept local so
// writer.ts doesn't import the full Settings type (which imports back from here).
export interface EnsureWriterSettings {
  writer?: managedwriter.JSONWriter;
  writeClient?: managedwriter.WriterClient;
  connection?: StreamConnection;
  connectionErrorListener?: RemoveListener;
  writerBroken?: boolean;
  lastStreamError?: Error;
  reopenWriter?: () => Promise<WriterHandles>;
  reopenInFlight?: Promise<void>;
}

/**
 * Single owner of the writer lifecycle on the push path. When the connection's
 * `'error'` handler has flagged the writer broken, attempt a lazy re-open
 * before failing:
 *   - success: swap in the fresh handles, clear the broken flag, proceed.
 *   - failure: stay broken, throw so the event is DLQ-routed.
 *
 * Self-heal is bounded along two independent axes:
 *
 * 1. ACROSS sequential passes, by the collector's breaker WITHOUT importing
 *    `@walkeros/collector`: the skip gate does not call push while the breaker
 *    is OPEN, admits exactly one probe when HALF-OPEN, and each failed re-open
 *    throws (feeding the breaker's transport-failure accounting until it opens).
 *    So once the breaker trips, no further re-opens are attempted.
 *
 * 2. WITHIN one pass, by the `reopenInFlight` memo. The breaker only opens
 *    AFTER a pass records its failures, so in the first (most concurrent) pass
 *    the breaker is still CLOSED and the collector fans the destination's
 *    admitted events out with Promise.all. Without the memo, every concurrent
 *    push would pass the `writerBroken` guard and each run its own
 *    closeWriter+reopen, orphaning a gRPC connection + live 'error' listener
 *    per redundant attempt. The memo collapses a concurrent burst into ONE
 *    re-open that every caller awaits; a shared failure rejects into all of
 *    them (each DLQ-routes correctly), and the memo clears in a finally so a
 *    later push retries.
 *
 * The single openWriter carries the gax CallOptions.timeout, so each attempt is
 * time-bounded. pushBatch shares this function, so it inherits both bounds.
 */
export function ensureWriter(
  settings: EnsureWriterSettings,
  logger: Logger.Instance,
): Promise<void> {
  if (!settings.writerBroken) return Promise.resolve();

  // A concurrent caller already started the re-open: join it instead of opening
  // a second connection (which would orphan one of them).
  if (settings.reopenInFlight) return settings.reopenInFlight;

  const lastError = settings.lastStreamError;
  logger.info('BigQuery writer broken; attempting one re-open before failing', {
    error: lastError ? lastError.message : 'unknown stream error',
  });

  const reopen = settings.reopenWriter;
  if (!reopen) {
    // No re-open hook (init never wired it): cannot self-heal, stay broken.
    return Promise.reject(
      new Error(
        'BigQuery writer is broken and no re-open hook is configured: ' +
          (lastError ? lastError.message : 'unknown stream error'),
      ),
    );
  }

  const inFlight = (async () => {
    try {
      // Release the broken handles (incl. its connection-error listener) before
      // re-opening so we don't leak the old gRPC connection. Only the one
      // caller that started the memo runs this, so the old handles are closed
      // exactly once.
      closeWriter(
        {
          writer: settings.writer,
          writeClient: settings.writeClient,
          connectionErrorListener: settings.connectionErrorListener,
        },
        logger,
      );

      const handles = await reopen();
      settings.writeClient = handles.writeClient;
      settings.writer = handles.writer;
      settings.connection = handles.connection;
      settings.connectionErrorListener = handles.connectionErrorListener;
      settings.writerBroken = false;
      settings.lastStreamError = undefined;
      logger.info('BigQuery writer re-opened after a stream error');
    } finally {
      // Clear the memo so a later push after a FAILED re-open retries (on a
      // successful re-open writerBroken is already false, so the next push skips
      // ensureWriter entirely).
      settings.reopenInFlight = undefined;
    }
  })();

  settings.reopenInFlight = inFlight;
  return inFlight;
}

/** Close handles in safe order. Errors are logged, never thrown (called from destroy). */
export function closeWriter(
  handles: Partial<WriterHandles>,
  logger: Logger.Instance,
): void {
  try {
    handles.connectionErrorListener?.off();
  } catch (err) {
    logger.warn('connection error listener removal failed', {
      error: String(err),
    });
  }
  try {
    handles.writer?.close();
  } catch (err) {
    logger.warn('writer.close failed', { error: String(err) });
  }
  try {
    handles.writeClient?.close();
  } catch (err) {
    logger.warn('writeClient.close failed', { error: String(err) });
  }
}
