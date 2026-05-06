import type { DestinationServer } from '@walkeros/server-core';
import type { Env, Setup, SetupSchemaField, Types } from './types';
import type { LifecycleContext, Logger } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';

// Setup is wired to the destination's `setup` slot which uses the broader
// `DestinationServer.Config<Types>` (settings is optional). We runtime-narrow
// instead of using the local Config alias so the assignment in index.ts
// type-checks without contravariance issues.
type WideConfig = DestinationServer.Config<Types>;

// Per Resolved Decision #2: only `name` is REQUIRED. All other columns
// are NULLABLE for resilience against partial events / test fixtures.
export const DEFAULT_SCHEMA: SetupSchemaField[] = [
  { name: 'name', type: 'STRING', mode: 'REQUIRED' },
  { name: 'data', type: 'JSON', mode: 'NULLABLE' },
  { name: 'context', type: 'JSON', mode: 'NULLABLE' },
  { name: 'globals', type: 'JSON', mode: 'NULLABLE' },
  { name: 'custom', type: 'JSON', mode: 'NULLABLE' },
  { name: 'user', type: 'JSON', mode: 'NULLABLE' },
  { name: 'nested', type: 'JSON', mode: 'NULLABLE' },
  { name: 'consent', type: 'JSON', mode: 'NULLABLE' },
  { name: 'id', type: 'STRING', mode: 'NULLABLE' },
  { name: 'trigger', type: 'STRING', mode: 'NULLABLE' },
  { name: 'entity', type: 'STRING', mode: 'NULLABLE' },
  { name: 'action', type: 'STRING', mode: 'NULLABLE' },
  { name: 'timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
  { name: 'timing', type: 'INT64', mode: 'NULLABLE' },
  { name: 'source', type: 'JSON', mode: 'NULLABLE' },
];

export const DEFAULT_SETUP: Required<Setup> = {
  location: 'EU',
  storageBillingModel: 'PHYSICAL',
  partitioning: { type: 'DAY', field: 'timestamp' },
  clustering: { fields: ['name', 'entity', 'action'] },
  schema: DEFAULT_SCHEMA,
};

export interface SetupResult {
  datasetCreated: boolean;
  tableCreated: boolean;
}

interface TableMetadataShape {
  timePartitioning?: unknown;
  clustering?: unknown;
  schema?: unknown;
}

interface DriftableTable {
  // Matches both real BigQuery Table.getMetadata() (returns [Metadata, ApiResponse])
  // and the test mock (returns [Metadata]). Only index 0 is consumed.
  getMetadata(): Promise<TableMetadataShape[]>;
}

interface PartitioningMeta {
  type?: string;
  field?: string;
}

interface ClusteringMeta {
  fields?: string[];
}

interface SchemaMeta {
  fields?: Array<{ name?: string; type?: string; mode?: string }>;
}

export async function setup(
  ctx: LifecycleContext<WideConfig, Env>,
): Promise<SetupResult | undefined> {
  const { config, logger } = ctx;
  const merged = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!merged) {
    logger.debug('setup: skipped (config.setup is false or unset)');
    return;
  }
  // Fill any holes a partial user override left, so all fields are required.
  const options: Required<Setup> = {
    location: merged.location ?? DEFAULT_SETUP.location,
    storageBillingModel:
      merged.storageBillingModel ?? DEFAULT_SETUP.storageBillingModel,
    partitioning: merged.partitioning ?? DEFAULT_SETUP.partitioning,
    clustering: merged.clustering ?? DEFAULT_SETUP.clustering,
    schema: merged.schema ?? DEFAULT_SETUP.schema,
  };

  if (!config.settings) {
    logger.throw('setup: settings missing');
    return;
  }
  const { client, datasetId, tableId } = config.settings;
  if (!client) {
    logger.throw('setup: BigQuery client is missing');
    return;
  }
  if (!datasetId) {
    logger.throw('setup: datasetId is missing');
    return;
  }
  if (!tableId) {
    logger.throw('setup: tableId is missing');
    return;
  }

  const dataset = client.dataset(datasetId);

  // 1. Dataset
  let datasetCreated = false;
  const [datasetExists] = await dataset.exists();
  if (!datasetExists) {
    try {
      await dataset.create({
        location: options.location,
        storageBillingModel: options.storageBillingModel,
      });
      datasetCreated = true;
      logger.info('setup: dataset created', {
        datasetId,
        location: options.location,
        storageBillingModel: options.storageBillingModel,
      });
    } catch (err) {
      if (isAlreadyExists(err)) {
        logger.debug('setup: dataset already exists (race)', { datasetId });
      } else {
        throw err;
      }
    }
  } else {
    logger.debug('setup: dataset exists', { datasetId });
  }

  // 2. Table
  const table = dataset.table(tableId);
  let tableCreated = false;
  const [tableExists] = await table.exists();
  if (!tableExists) {
    try {
      await table.create({
        schema: { fields: options.schema },
        timePartitioning: {
          type: options.partitioning.type,
          field: options.partitioning.field,
        },
        clustering: { fields: options.clustering.fields },
      });
      tableCreated = true;
      logger.info('setup: table created', {
        datasetId,
        tableId,
        partitioning: options.partitioning,
        clustering: options.clustering,
      });
    } catch (err) {
      if (isAlreadyExists(err)) {
        logger.debug('setup: table already exists (race)', { tableId });
      } else {
        throw err;
      }
    }
  } else {
    logger.debug('setup: table exists', { datasetId, tableId });
    await detectDrift(table, options, logger);
  }

  return { datasetCreated, tableCreated };
}

function hasCode(err: unknown): err is { code: number } {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  const obj: { code?: unknown } = err;
  return typeof obj.code === 'number';
}

function isAlreadyExists(err: unknown): boolean {
  return hasCode(err) && err.code === 409;
}

async function detectDrift(
  table: DriftableTable,
  options: Required<Setup>,
  logger: Logger.Instance,
): Promise<void> {
  let metadata: TableMetadataShape;
  try {
    const [meta] = await table.getMetadata();
    metadata = meta ?? {};
  } catch (err) {
    logger.debug('setup: drift check failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // Partition drift
  if (isPartitioningMeta(metadata.timePartitioning)) {
    const actual = metadata.timePartitioning;
    const declared = options.partitioning;
    if (actual.type !== declared.type || actual.field !== declared.field) {
      logger.warn('setup.drift', {
        field: 'timePartitioning',
        declared,
        actual,
      });
    }
  }

  // Clustering drift
  if (isClusteringMeta(metadata.clustering)) {
    const actualFields = metadata.clustering.fields ?? [];
    const declaredFields = options.clustering.fields;
    if (
      actualFields.length !== declaredFields.length ||
      actualFields.some((f, i) => f !== declaredFields[i])
    ) {
      logger.warn('setup.drift', {
        field: 'clustering',
        declared: { fields: declaredFields },
        actual: { fields: actualFields },
      });
    }
  }

  // Schema drift (column names and types only; descriptions ignored)
  if (isSchemaMeta(metadata.schema)) {
    const actualFields = metadata.schema.fields ?? [];
    const declaredFields = options.schema;
    const driftDetected =
      actualFields.length !== declaredFields.length ||
      declaredFields.some((d, i) => {
        const a = actualFields[i];
        return !a || a.name !== d.name || a.type !== d.type;
      });
    if (driftDetected) {
      logger.warn('setup.drift', {
        field: 'schema',
        declared: declaredFields.map((f) => ({ name: f.name, type: f.type })),
        actual: actualFields.map((f) => ({ name: f.name, type: f.type })),
      });
    }
  }
}

function isPartitioningMeta(v: unknown): v is PartitioningMeta {
  return typeof v === 'object' && v !== null;
}

function isClusteringMeta(v: unknown): v is ClusteringMeta {
  return typeof v === 'object' && v !== null;
}

function isSchemaMeta(v: unknown): v is SchemaMeta {
  return typeof v === 'object' && v !== null;
}
