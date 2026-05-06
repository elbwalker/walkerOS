import type { GcsStoreSettings } from '../types';
import { resolveProjectId } from '../setup-helpers';

describe('resolveProjectId', () => {
  const ORIGINAL_ENV = process.env.GOOGLE_CLOUD_PROJECT;

  beforeEach(() => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });

  afterAll(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    } else {
      process.env.GOOGLE_CLOUD_PROJECT = ORIGINAL_ENV;
    }
  });

  it('returns setup.projectId when explicitly set (highest priority)', () => {
    const settings: GcsStoreSettings = {
      bucket: 'b',
      credentials: {
        client_email: 'sa@example.iam.gserviceaccount.com',
        private_key:
          '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----',
      },
    };
    process.env.GOOGLE_CLOUD_PROJECT = 'env-project';

    const result = resolveProjectId(settings, {
      projectId: 'explicit-project',
    });

    expect(result).toBe('explicit-project');
  });

  it('falls back to credentials.project_id when setup.projectId is missing', () => {
    const settings: GcsStoreSettings = {
      bucket: 'b',
      credentials: JSON.stringify({
        client_email: 'sa@example.iam.gserviceaccount.com',
        private_key:
          '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----',
        project_id: 'creds-project',
      }),
    };
    process.env.GOOGLE_CLOUD_PROJECT = 'env-project';

    const result = resolveProjectId(settings, {});

    expect(result).toBe('creds-project');
  });

  it('falls back to process.env.GOOGLE_CLOUD_PROJECT when no other source has it', () => {
    const settings: GcsStoreSettings = {
      bucket: 'b',
    };
    process.env.GOOGLE_CLOUD_PROJECT = 'env-project';

    const result = resolveProjectId(settings, {});

    expect(result).toBe('env-project');
  });

  it('throws an actionable error when no source provides a project id', () => {
    const settings: GcsStoreSettings = {
      bucket: 'b',
    };

    expect(() => resolveProjectId(settings, {})).toThrow(
      'setup: projectId is required. Set setup.projectId, provide a service account with project_id, or export GOOGLE_CLOUD_PROJECT.',
    );
  });
});
