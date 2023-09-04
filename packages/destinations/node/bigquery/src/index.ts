import type { BigQueryOptions } from '@google-cloud/bigquery';
import type { Function, Row } from './types';
import { BigQuery } from '@google-cloud/bigquery';

export const destinationBigQuery: Function = {
  // meta: {
  //   name: 'BigQuery',
  //   version: '0.0.7',
  // },

  config: {},

  async init(config) {
    const { custom } = config;
    if (!custom) error('Config custom missing');

    let { client, projectId, location, datasetId, tableId, bigquery } = custom;
    if (!projectId) error('Config custom projectId missing');

    location = location || 'EU';
    datasetId = datasetId || 'eventpipe';
    tableId = tableId || 'events';

    const options: BigQueryOptions = bigquery || {};
    if (projectId) options.projectId = projectId;

    client = client || new BigQuery(options);

    this.config = {
      custom: {
        client,
        projectId,
        location,
        datasetId,
        tableId,
      },
    };

    return true;
  },

  async push(events) {
    return { queue: [] };
  },
};

function error(message: string): never {
  throw new Error(message);
}

function log(message: string): void {
  console.dir(message, { depth: 4 });
}

export default destinationBigQuery;
