import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';
import { pushBatch } from './pushBatch';
import { setup } from './setup';
import { openWriter, closeWriter } from './writer';

// Types
export * as DestinationBigQuery from './types';

export const destinationBigQuery: Destination = {
  type: 'gcp-bigquery',

  config: {},

  setup,

  async init({ config: partialConfig, env, logger, id }) {
    const config = getConfig(partialConfig, env, logger);

    // Open the long-lived JSONWriter on the _default stream.
    // Hard-fail when the dataset/table is missing.
    try {
      const { writer, writeClient } = await openWriter(
        {
          projectId: config.settings.projectId,
          datasetId: config.settings.datasetId,
          tableId: config.settings.tableId,
        },
        logger,
      );
      config.settings.writer = writer;
      config.settings.writeClient = writeClient;
    } catch (err) {
      if (isNotFound(err)) {
        const target = `${config.settings.datasetId}.${config.settings.tableId}`;
        const project = config.settings.projectId;
        logger.error(
          `BigQuery dataset or table not found: project="${project}", target="${target}". ` +
            `Run "walkeros setup destination.${id}" to create them.`,
          {
            project,
            target,
            originalError: err instanceof Error ? err.message : String(err),
          },
        );
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
