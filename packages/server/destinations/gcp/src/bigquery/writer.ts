import type { Logger, ServiceAccount } from '@walkeros/core';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import { managedwriter, adapt, protos } from '@google-cloud/bigquery-storage';

// gax CallOptions, derived from the SDK's own method signature so we don't take
// a direct dependency on `google-gax` (a transitive dep of bigquery-storage).
// `getWriteStream(request, options?: CallOptions)` -> the optional 2nd param.
type CallOptions = NonNullable<
  Parameters<managedwriter.WriterClient['getWriteStream']>[1]
>;

// The SDK's StreamConnection instance returned by createStreamConnection.
// Derived from the SDK method signature so we don't import the un-exported
// StreamConnection class. The SDK kit's connection type.
export type StreamConnection = Awaited<
  ReturnType<managedwriter.WriterClient['createStreamConnection']>
>;

// SDK-derived shapes the structural types below speak in (types only).
type ClientOptions = NonNullable<
  ConstructorParameters<typeof managedwriter.WriterClient>[0]
>;
type WriteStreamRequest = Parameters<
  managedwriter.WriterClient['getWriteStream']
>[0];
type WriteStreamInfo = Awaited<
  ReturnType<managedwriter.WriterClient['getWriteStream']>
>;
type TableSchema = NonNullable<WriteStreamInfo['tableSchema']>;
type ProtoDescriptor = ConstructorParameters<
  typeof managedwriter.JSONWriter
>[0]['protoDescriptor'];
type RowList = Parameters<managedwriter.JSONWriter['appendRows']>[0];
type AppendResponse = Awaited<
  ReturnType<ReturnType<managedwriter.JSONWriter['appendRows']>['getResult']>
>;

/** The `{ off }` disposable returned by `onConnectionError`. */
export interface ConnectionListener {
  off(): void;
}

/** The connection surface the writer uses: its stream id and error hook. */
export interface WriteConnection {
  getStreamId(): string;
  onConnectionError(listener: (err: unknown) => void): ConnectionListener;
}

/** The fields of an append response that push and pushBatch read. */
export type AppendOutcome = Pick<AppendResponse, 'rowErrors' | 'appendResult'>;

/** The row writer surface push and pushBatch use. */
export interface RowWriter {
  appendRows(rows: RowList): { getResult(): Promise<AppendOutcome> };
  close(): void;
}

/** The Storage Write client surface the writer uses. */
export interface WriteClient<C extends WriteConnection> {
  createStreamConnection(request: {
    destinationTable: string;
    streamId: string;
  }): Promise<C>;
  getWriteStream(
    request: WriteStreamRequest,
    options?: CallOptions,
  ): Promise<{ tableSchema?: TableSchema | null }>;
  close(): void;
}

/** Converts the table schema into the writer's proto descriptor. */
export interface SchemaAdapter {
  convertStorageSchemaToProto2Descriptor(
    schema: TableSchema,
    scope: string,
  ): ProtoDescriptor;
}

/**
 * The three Storage Write pieces the writer is built from. The connection type
 * ties a kit's client to the SAME kit's JSONWriter: the SDK JSONWriter only
 * accepts the SDK's own StreamConnection.
 */
export interface WriterKit<C extends WriteConnection> {
  WriterClient: new (options: ClientOptions) => WriteClient<C>;
  JSONWriter: new (args: {
    connection: C;
    protoDescriptor: ProtoDescriptor;
  }) => RowWriter;
  adapt: SchemaAdapter;
}

/**
 * The Storage Write API pieces a destination env may inject (tests, simulate).
 * Without `WriterClient`, each missing piece falls back to the SDK, so runtime
 * needs none of them. An injected `WriterClient` needs an injected
 * `JSONWriter`: its connection cannot feed the SDK writer.
 */
export interface WriterEnv {
  WriterClient?: WriterKit<WriteConnection>['WriterClient'];
  JSONWriter?: WriterKit<WriteConnection>['JSONWriter'];
  adapt?: SchemaAdapter;
}

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
   * Deadline in ms for unary control-plane calls (the getWriteStream schema
   * fetch), derived from the standard per-step `config.timeout`. Never applied
   * to the appendRows stream: a gax deadline on a bidi stream bounds the WHOLE
   * stream lifetime, not one append. Per-delivery bounds live in the collector
   * (it races every push at `config.timeout`); the stream stays on the SDK
   * default so it can live for hours.
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
  /** Injected SDK pieces (the destination env); the SDK is the fallback. */
  env?: WriterEnv;
}

export interface WriterHandles {
  writeClient: WriteClient<WriteConnection>;
  writer: RowWriter;
  // The StreamConnection the writer appends to. Held so closeWriter can remove
  // the connection-error listener it owns.
  connection: WriteConnection;
  // The `{ off }` disposable for the connection-error listener, removed in
  // closeWriter so a re-opened writer doesn't accumulate stale listeners.
  connectionErrorListener?: ConnectionListener;
}

/**
 * Open a long-lived JSONWriter on the table's _default stream.
 * Requires the dataset and table to already exist (run `walkeros setup` first).
 *
 * The SDK pieces come from `args.env` when injected (tests, simulate), else
 * from `@google-cloud/bigquery-storage`. Without an injected `WriterClient`
 * the SDK kit is used, with an injected `JSONWriter`/`adapt` taking their
 * place when given. An injected `WriterClient` needs an injected `JSONWriter`
 * (the SDK writer only accepts the SDK's own connection); without one, init
 * fails and the injected client is closed.
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
export function openWriter(
  args: OpenWriterArgs,
  logger: Logger.Instance,
): Promise<WriterHandles> {
  const { env } = args;
  if (!env?.WriterClient) {
    const sdkKit: WriterKit<StreamConnection> = {
      WriterClient: managedwriter.WriterClient,
      JSONWriter: env?.JSONWriter ?? managedwriter.JSONWriter,
      adapt: env?.adapt ?? adapt,
    };
    return openWith(sdkKit, args, logger);
  }
  const envKit: WriterKit<WriteConnection> = {
    WriterClient: env.WriterClient,
    JSONWriter: env.JSONWriter ?? MissingJSONWriter,
    adapt: env.adapt ?? adapt,
  };
  return openWith(envKit, args, logger);
}

const MISSING_JSON_WRITER =
  'BigQuery env: an injected WriterClient needs an injected JSONWriter; its connection cannot feed the SDK writer.';

// The env kit's JSONWriter when an env injects a WriterClient without one.
// Building it fails, so openWith's cleanup closes the injected client.
class MissingJSONWriter implements RowWriter {
  constructor() {
    throw new Error(MISSING_JSON_WRITER);
  }
  appendRows(): { getResult(): Promise<AppendOutcome> } {
    throw new Error(MISSING_JSON_WRITER);
  }
  close(): void {}
}

async function openWith<C extends WriteConnection>(
  { WriterClient, JSONWriter, adapt: adaptFn }: WriterKit<C>,
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

  // gax call options carrying the deadline for UNARY control-plane calls
  // (the getWriteStream schema fetch). Never passed to createStreamConnection:
  // a CallOptions.timeout on the appendRows bidi stream is the stream's TOTAL
  // deadline, killing a healthy connection when it expires. The stream keeps
  // the SDK's own long-lived default; individual deliveries are bounded by the
  // collector's per-push race (config.timeout), not by a transport deadline.
  // Left undefined when no timeout is configured.
  const callOptions: CallOptions | undefined =
    timeout === undefined ? undefined : { timeout };

  // The WriterClient takes google-gax ClientOptions, which extend
  // GoogleAuthOptions: `projectId` + `credentials` (a JWTInput, i.e.
  // { client_email, private_key, ... }), the same auth surface as
  // BigQueryOptions on the query client. Spread the resolved `config.credentials`
  // last so it wins over any `settings.bigquery.credentials`, mirroring the query
  // client's resolution in getConfig (one identity per destination).
  const writeClient = new WriterClient({
    projectId,
    ...bigquery,
    ...(credentials !== undefined ? { credentials } : {}),
  });
  let connectionErrorListener: ConnectionListener | undefined;
  let connection: C | undefined;
  try {
    // Use streamId (not streamType) so the SDK resolves to the table's
    // implicit `_default` stream without calling CreateWriteStream. Passing
    // managedwriter.DefaultStream as streamType triggers a CreateWriteStream
    // call with type='DEFAULT', which BQ rejects as TYPE_UNSPECIFIED.
    connection = await writeClient.createStreamConnection({
      destinationTable,
      streamId: managedwriter.DefaultStream,
    });

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
    const protoDescriptor = adaptFn.convertStorageSchemaToProto2Descriptor(
      writeStream.tableSchema,
      'root',
    );
    const writer = new JSONWriter({
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
  writer?: RowWriter;
  writeClient?: WriteClient<WriteConnection>;
  connection?: WriteConnection;
  connectionErrorListener?: ConnectionListener;
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
 * A re-open's unary schema fetch is bounded by the gax CallOptions.timeout;
 * the re-open as a whole runs in-band on a push, under the collector's
 * per-delivery race. pushBatch shares this function, so it inherits both
 * bounds.
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
