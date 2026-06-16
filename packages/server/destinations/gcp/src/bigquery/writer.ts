import type { Logger } from '@walkeros/core';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import { managedwriter, adapt, protos } from '@google-cloud/bigquery-storage';

// gax CallOptions, derived from the SDK's own method signature so we don't take
// a direct dependency on `google-gax` (a transitive dep of bigquery-storage).
// `getWriteStream(request, options?: CallOptions)` -> the optional 2nd param.
type CallOptions = NonNullable<
  Parameters<managedwriter.WriterClient['getWriteStream']>[1]
>;

export interface OpenWriterArgs {
  projectId: string;
  datasetId: string;
  tableId: string;
  // Auth forwarded from settings.bigquery so the data-plane WriterClient
  // authenticates like the control plane instead of falling back to ADC.
  bigquery?: BigQueryOptions;
  /**
   * gRPC deadline in milliseconds, derived from the standard per-step
   * `config.timeout`. Applied as the gax `CallOptions.timeout` on the appendRows
   * bidi stream (via createStreamConnection) and the unary getWriteStream schema
   * fetch, so a hanging call is cancelled by gRPC and rejects instead of running
   * detached.
   */
  timeout?: number;
}

export interface WriterHandles {
  writeClient: managedwriter.WriterClient;
  writer: managedwriter.JSONWriter;
}

/**
 * Open a long-lived JSONWriter on the table's _default stream.
 * Requires the dataset and table to already exist (run `walkeros setup` first).
 *
 * Sequence (per SDK docs and empirical SDK probe):
 *   1. new WriterClient
 *   2. createStreamConnection
 *   3. getWriteStream(view: FULL) to retrieve the table schema
 *   4. adapt.convertStorageSchemaToProto2Descriptor → protoDescriptor
 *   5. new JSONWriter({ connection, protoDescriptor })
 */
export async function openWriter(
  args: OpenWriterArgs,
  logger: Logger.Instance,
): Promise<WriterHandles> {
  const { projectId, datasetId, tableId, bigquery, timeout } = args;
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

  const writeClient = new managedwriter.WriterClient({
    projectId,
    ...bigquery,
  });
  try {
    // Use streamId (not streamType) so the SDK resolves to the table's
    // implicit `_default` stream without calling CreateWriteStream. Passing
    // managedwriter.DefaultStream as streamType triggers a CreateWriteStream
    // call with type='DEFAULT', which BQ rejects as TYPE_UNSPECIFIED.
    const connection = await writeClient.createStreamConnection(
      {
        destinationTable,
        streamId: managedwriter.DefaultStream,
      },
      callOptions,
    );
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

    return { writeClient, writer };
  } catch (err) {
    // Release any resources already opened by the partial init so we don't
    // leak gRPC handles. closeWriter swallows close errors and only logs.
    closeWriter({ writeClient }, logger);
    throw err;
  }
}

/** Close handles in safe order. Errors are logged, never thrown (called from destroy). */
export function closeWriter(
  handles: Partial<WriterHandles>,
  logger: Logger.Instance,
): void {
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
