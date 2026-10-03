import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HEARTBEAT_OPERATION,
  SECRET_VALUES_OPERATION,
  heartbeatUrl,
  secretValuesUrl,
} from '../api-paths.js';

describe('api-paths', () => {
  it('pins the two app operations the runner calls', () => {
    expect(HEARTBEAT_OPERATION).toBe(
      'POST /api/projects/{projectId}/runners/heartbeat',
    );
    expect(SECRET_VALUES_OPERATION).toBe(
      'GET /api/projects/{projectId}/flows/{flowId}/secrets/values',
    );
  });

  it('builds the heartbeat URL', () => {
    expect(heartbeatUrl('https://app.test', 'proj_1')).toBe(
      'https://app.test/api/projects/proj_1/runners/heartbeat',
    );
  });

  it('builds the secret values URL', () => {
    expect(secretValuesUrl('https://app.test', 'proj_1', 'flow_1')).toBe(
      'https://app.test/api/projects/proj_1/flows/flow_1/secrets/values',
    );
  });

  it('encodes each path parameter once', () => {
    expect(secretValuesUrl('https://app.test', 'proj/1', 'flow%20a')).toBe(
      'https://app.test/api/projects/proj%2F1/flows/flow%2520a/secrets/values',
    );
  });

  it('is listed in the CLI client operations manifest for the runner', () => {
    // __tests__ -> src -> runner -> packages, then into cli.
    const manifestPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../cli/openapi/client-operations.json',
    );
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const runnerOps = Array.isArray(manifest)
      ? manifest.flatMap((entry: unknown) =>
          entry !== null &&
          typeof entry === 'object' &&
          'op' in entry &&
          'usedBy' in entry &&
          Array.isArray(entry.usedBy) &&
          entry.usedBy.includes('runner')
            ? [entry.op]
            : [],
        )
      : [];
    expect(runnerOps.sort()).toEqual(
      [HEARTBEAT_OPERATION, SECRET_VALUES_OPERATION].sort(),
    );
  });
});
