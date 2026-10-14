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
});
