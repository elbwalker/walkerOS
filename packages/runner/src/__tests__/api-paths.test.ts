import {
  ARCHIVE_OPERATION,
  CHECK_IN_OPERATION,
  RELEASE_OPERATION,
  RELEASE_SECRETS_OPERATION,
  SECRETS_OPERATION,
  archiveUrl,
  checkInUrl,
  releaseSecretsUrl,
  releaseUrl,
  secretsUrl,
} from '../api-paths.js';

describe('api-paths', () => {
  it.each([
    [
      CHECK_IN_OPERATION,
      'POST /api/runner/check-in',
      checkInUrl('https://app.example'),
      'https://app.example/api/runner/check-in',
    ],
    [
      SECRETS_OPERATION,
      'GET /api/runner/secrets',
      secretsUrl('https://app.example'),
      'https://app.example/api/runner/secrets',
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
    'pins the operation %s and its URL, each path parameter encoded once',
    (operation, pinned, url, expected) => {
      expect(operation).toBe(pinned);
      expect(url).toBe(expected);
    },
  );
});
