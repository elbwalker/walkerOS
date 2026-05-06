import type { Logger } from '@walkeros/core';
import { managedwriter, adapt, protos } from '@google-cloud/bigquery-storage';

export interface OpenWriterArgs {
  projectId: string;
  datasetId: string;
  tableId: string;
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
  const { projectId, datasetId, tableId } = args;
  const destinationTable = `projects/${projectId}/datasets/${datasetId}/tables/${tableId}`;

  logger.debug('Opening BigQuery Storage Write API writer', {
    destinationTable,
  });

  const writeClient = new managedwriter.WriterClient({ projectId });
  try {
    const connection = await writeClient.createStreamConnection({
      destinationTable,
      streamType: managedwriter.DefaultStream,
    });
    const streamId = connection.getStreamId();
    const writeStream = await writeClient.getWriteStream({
      streamId,
      view: protos.google.cloud.bigquery.storage.v1.WriteStreamView.FULL,
    });
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
