import type { Config } from './types';
import { schema } from './schema';
import { Dataset } from '@google-cloud/bigquery';

async function checkDataset(dataset: Dataset): Promise<boolean> {
  try {
    return (await dataset.exists())[0];
  } catch {
    return false;
  }
}

async function checkTable(dataset: Dataset, tableId: string): Promise<boolean> {
  try {
    await dataset.table(tableId).get();
    return true;
  } catch {
    return false;
  }
}

export const setup = async function (config: Config) {
  const { client, datasetId, location, tableId } = config.custom;
  const dataset = client.dataset(datasetId);

  // Check if dataset exists
  if (!(await checkDataset(dataset))) {
    config.onLog(`Creating dataset ${datasetId}`);
    await client.createDataset(datasetId, { location });
  }

  // Check if table exists
  if (!(await checkTable(dataset, tableId))) {
    config.onLog(`Creating table ${datasetId}.${tableId}`);
    await dataset.createTable(tableId, schema);
  }

  return true;
};
