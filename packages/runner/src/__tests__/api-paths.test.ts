import {
  ARCHIVE_OPERATION,
  CHECK_IN_OPERATION,
  HEARTBEAT_OPERATION,
  RELEASE_OPERATION,
  RELEASE_SECRETS_OPERATION,
  SECRET_VALUES_OPERATION,
  archiveUrl,
  checkInUrl,
  heartbeatUrl,
  releaseSecretsUrl,
  releaseUrl,
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

  it.each([
    [
      CHECK_IN_OPERATION,
      'POST /api/runner/check-in',
      checkInUrl('https://app.example'),
      'https://app.example/api/runner/check-in',
    ],
    [
      RELEASE_OPERATION,
      'GET /api/runner/release',
      releaseUrl('https://app.example'),
      'https://app.example/api/runner/release',
    ],
    [
      ARCHIVE_OPERATION,
      'GET /api/runner/versions/{versionId}/bundle-archive',
      archiveUrl('https://app.example', 'dv_a/b'),
      'https://app.example/api/runner/versions/dv_a%2Fb/bundle-archive',
    ],
    [
      RELEASE_SECRETS_OPERATION,
      'GET /api/runner/versions/{versionId}/secrets',
      releaseSecretsUrl('https://app.example', 'dv_a/b'),
      'https://app.example/api/runner/versions/dv_a%2Fb/secrets',
    ],
  ])(
    'pins the remote operation %s and its URL',
    (operation, pinned, url, expected) => {
      expect(operation).toBe(pinned);
      expect(url).toBe(expected);
    },
  );
});
