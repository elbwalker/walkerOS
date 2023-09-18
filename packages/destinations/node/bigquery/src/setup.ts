import type { CustomConfig } from './types';
import { schema } from './schema';
import { log } from './utils';

export const setup = async function (custom: CustomConfig) {
  if (await existsDatasetAndTable(custom)) {
    log('Dataset and table already exists');
    return true;
  } else {
    log('Creating dataset and/or table');
    await createDatasetAndTable(custom);
    log('Dataset and table created');
    return true;
  }
};

export const createDatasetAndTable = async function (custom: CustomConfig) {
  const { client, datasetId, location, tableId } = custom;

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
  custom: CustomConfig,
): Promise<boolean> {
  const { client, datasetId, tableId } = custom;

  const dataset = client.dataset(datasetId);

  try {
    await dataset.exists();
    await dataset.table(tableId).get();
    return true;
  } catch (e) {
    return false;
  }
};
