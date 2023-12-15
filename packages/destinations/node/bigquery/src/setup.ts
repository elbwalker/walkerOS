import type { Config } from './types';
import { schema } from './schema';

export const setup = async function (config: Config) {
  if (await existsDatasetAndTable(config)) {
    config.onLog('Dataset and table already exists');
    return true;
  } else {
    config.onLog('Creating dataset and/or table');
    await createDatasetAndTable(config);
    config.onLog('Dataset and table created');
    return true;
  }
};

export const createDatasetAndTable = async function (config: Config) {
  const { client, datasetId, location, tableId } = config.custom;

  try {
    await client.createDataset(datasetId, { location });
  } catch (e) {
    if (!(e as Error).message.includes('Already Exists')) {
      throw e;
    }
  }

  try {
    if (location) schema.location = location;

    await client.dataset(datasetId).createTable(tableId, schema);
  } catch (e) {
    if (!(e as Error).message.includes('Already Exists')) {
      throw e;
    }
  }

  return true;
};

export const existsDatasetAndTable = async function (
  config: Config,
): Promise<boolean> {
  const { client, datasetId, tableId } = config.custom;

  const dataset = client.dataset(datasetId);

  try {
    await dataset.exists();
    await dataset.table(tableId).get();
    return true;
  } catch (e) {
    return false;
  }
};
