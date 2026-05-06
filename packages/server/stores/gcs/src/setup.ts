import type { LifecycleContext, Logger, Store, SetupFn } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type {
  GcsStoreSettings,
  ServiceAccountCredentials,
  Setup,
  Types,
} from './types';
import { createTokenProvider } from './auth';
import { resolveProjectId } from './setup-helpers';

const GCS_BASE = 'https://storage.googleapis.com';

/**
 * Default setup options. Optional fields (lifecycle, kmsKeyName, labels,
 * projectId) are intentionally omitted so the resolved options carry
 * `undefined` for them and the body builder can skip writing those
 * properties to the create request payload.
 */
export const DEFAULT_SETUP: Setup = {
  location: 'EU',
  storageClass: 'STANDARD',
  versioning: false,
};

export interface SetupResult {
  bucketCreated: boolean;
}

/**
 * Public alias kept for callers that imported the prior shape.
 * Equivalent to the framework's `Store.Config<Types>`.
 */
export type GcsStoreConfig = Store.Config<Types>;

/**
 * Provision a GCS bucket described in the flow config.
 * Idempotent: 409 means the bucket exists, drift is logged but never patched.
 * Never auto-mutates an existing bucket.
 */
export const setup: SetupFn<GcsStoreConfig, Store.BaseEnv> = async (
  context: LifecycleContext<GcsStoreConfig, Store.BaseEnv>,
) => {
  const { config, logger } = context;
  const options = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!options) {
    logger.debug('setup: skipped (config.setup is false or unset)');
    return;
  }

  const settings = config.settings;
  if (!settings || !settings.bucket) {
    throw new Error('setup: settings.bucket is required');
  }

  const projectId = resolveProjectId(settings, options);
  const creds = parseCredentials(settings.credentials);
  const getToken = createTokenProvider(creds);
  const token = await getToken();

  const createUrl = `${GCS_BASE}/storage/v1/b?project=${encodeURIComponent(projectId)}`;
  const body = buildCreateBody(settings.bucket, options);

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (createRes.status === 200 || createRes.status === 201) {
    logger.info('setup: bucket created', {
      bucket: settings.bucket,
      projectId,
      location: options.location,
    });
    return { bucketCreated: true };
  }

  if (createRes.status !== 409) {
    const text = await safeText(createRes);
    throw new Error(
      `setup: bucket create failed (${createRes.status}): ${text}`,
    );
  }

  logger.debug('setup: bucket already exists', { bucket: settings.bucket });
  await detectDrift(settings.bucket, token, options, logger);
  return { bucketCreated: false };
};

interface CreateBody {
  name: string;
  location?: string;
  storageClass?: string;
  versioning: { enabled: boolean };
  iamConfiguration: {
    uniformBucketLevelAccess: { enabled: true };
    publicAccessPrevention: 'enforced';
  };
  labels?: Record<string, string>;
  encryption?: { defaultKmsKeyName: string };
  lifecycle?: { rule: unknown[] };
}

function buildCreateBody(bucket: string, options: Setup): CreateBody {
  const body: CreateBody = {
    name: bucket,
    location: options.location,
    storageClass: options.storageClass,
    versioning: { enabled: options.versioning ?? false },
    iamConfiguration: {
      uniformBucketLevelAccess: { enabled: true },
      publicAccessPrevention: 'enforced',
    },
  };
  if (options.labels) body.labels = options.labels;
  if (options.kmsKeyName) {
    body.encryption = { defaultKmsKeyName: options.kmsKeyName };
  }
  if (options.lifecycle) body.lifecycle = options.lifecycle;
  return body;
}

function parseCredentials(
  credentials?: string | ServiceAccountCredentials,
): ServiceAccountCredentials | undefined {
  if (!credentials) return undefined;
  if (typeof credentials === 'string') {
    const parsed: unknown = JSON.parse(credentials);
    if (isServiceAccountShape(parsed)) return parsed;
    return undefined;
  }
  return credentials;
}

function isServiceAccountShape(
  value: unknown,
): value is ServiceAccountCredentials {
  if (!isRecord(value)) return false;
  return (
    typeof value.client_email === 'string' &&
    typeof value.private_key === 'string'
  );
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

interface BucketMetadata {
  location?: string;
  storageClass?: string;
  versioning?: { enabled?: boolean };
  iamConfiguration?: {
    uniformBucketLevelAccess?: { enabled?: boolean };
    publicAccessPrevention?: string;
  };
  labels?: Record<string, string>;
}

async function detectDrift(
  bucket: string,
  token: string,
  options: Setup,
  logger: Logger.Instance,
): Promise<void> {
  const url = `${GCS_BASE}/storage/v1/b/${encodeURIComponent(bucket)}`;
  let metadata: BucketMetadata;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      logger.debug('setup: drift check failed (non-fatal)', {
        status: res.status,
      });
      return;
    }
    const parsed: unknown = await res.json();
    metadata = readBucketMetadata(parsed);
  } catch (err) {
    logger.debug('setup: drift check failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (
    typeof metadata.location === 'string' &&
    options.location !== undefined &&
    metadata.location !== options.location
  ) {
    logger.warn('setup.drift', {
      field: 'location',
      declared: options.location,
      actual: metadata.location,
    });
  }

  if (
    typeof metadata.storageClass === 'string' &&
    options.storageClass !== undefined &&
    metadata.storageClass !== options.storageClass
  ) {
    logger.warn('setup.drift', {
      field: 'storageClass',
      declared: options.storageClass,
      actual: metadata.storageClass,
    });
  }

  const declaredVersioning = options.versioning ?? false;
  const actualVersioning = metadata.versioning?.enabled;
  if (
    typeof actualVersioning === 'boolean' &&
    actualVersioning !== declaredVersioning
  ) {
    logger.warn('setup.drift', {
      field: 'versioning',
      declared: declaredVersioning,
      actual: actualVersioning,
    });
  }

  const iam = metadata.iamConfiguration;
  if (iam) {
    const actualUniform = iam.uniformBucketLevelAccess?.enabled;
    if (typeof actualUniform === 'boolean' && actualUniform !== true) {
      logger.warn('setup.drift', {
        field: 'uniformBucketLevelAccess',
        declared: true,
        actual: actualUniform,
      });
    }
    const actualPap = iam.publicAccessPrevention;
    if (typeof actualPap === 'string' && actualPap !== 'enforced') {
      logger.warn('setup.drift', {
        field: 'publicAccessPrevention',
        declared: 'enforced',
        actual: actualPap,
      });
    }
  }

  if (options.labels) {
    const actualLabels = metadata.labels ?? {};
    if (!labelsEqual(options.labels, actualLabels)) {
      logger.warn('setup.drift', {
        field: 'labels',
        declared: options.labels,
        actual: actualLabels,
      });
    }
  }
}

function labelsEqual(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readBucketMetadata(value: unknown): BucketMetadata {
  if (!isRecord(value)) return {};
  const out: BucketMetadata = {};
  if (typeof value.location === 'string') out.location = value.location;
  if (typeof value.storageClass === 'string') {
    out.storageClass = value.storageClass;
  }
  if (isRecord(value.versioning)) {
    const enabled = value.versioning.enabled;
    if (typeof enabled === 'boolean') {
      out.versioning = { enabled };
    }
  }
  if (isRecord(value.iamConfiguration)) {
    const iam: BucketMetadata['iamConfiguration'] = {};
    const uniform = value.iamConfiguration.uniformBucketLevelAccess;
    if (isRecord(uniform) && typeof uniform.enabled === 'boolean') {
      iam.uniformBucketLevelAccess = { enabled: uniform.enabled };
    }
    const pap = value.iamConfiguration.publicAccessPrevention;
    if (typeof pap === 'string') iam.publicAccessPrevention = pap;
    out.iamConfiguration = iam;
  }
  if (isRecord(value.labels)) {
    const labels: Record<string, string> = {};
    for (const [k, v] of Object.entries(value.labels)) {
      if (typeof v === 'string') labels[k] = v;
    }
    out.labels = labels;
  }
  return out;
}
