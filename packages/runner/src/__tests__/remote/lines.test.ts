import { redactLine } from '@walkeros/core';
import {
  cachedArtifactRemovedLine,
  cachedDocumentSkippedLine,
  checkInAnsweredLine,
  checkInFailedLine,
  checkInRefusedLine,
  crashLine,
  documentNotFetchedLine,
  documentRefusedByLine,
  exitedBeforeReadyLine,
  heapLine,
  noReleaseCanRunLine,
  noReleaseToRunLine,
  notReadyLine,
  notStartedLine,
  restartNotReadyLine,
  restartNotStartedLine,
  releaseLabel,
  releaseNotFetchedLine,
  releaseRefusedByLine,
  releaseRefusedLine,
  releaseRunningLine,
  releaseStartingLine,
  shortSha,
  skippedLine,
  startingAgainLine,
} from '../../remote/lines.js';

const SHA = '3f9a2b7c1d4e' + 'a'.repeat(52);
const SHOP = { sequence: 17, sha256: SHA, flowName: 'shop' };

describe('releaseLabel and shortSha', () => {
  it('names a release by its sequence and an artifact by 12 hex', () => {
    expect([releaseLabel(17), shortSha(SHA)]).toEqual([
      'v17',
      'sha256 3f9a2b7c1d4e',
    ]);
  });
});

describe('the remote lines', () => {
  it.each<[string, string]>([
    [
      heapLine({
        heapMb: 324,
        from: 'granted',
        grantedMb: 512,
        supervisorMb: 60,
      }),
      'Heap 324 MB for the flow: three quarters of 512 MB granted, less 60 MB for the supervisor',
    ],
    [
      heapLine({ heapMb: 200, from: 'flag' }),
      'Heap 200 MB for the flow, from --heap',
    ],
    [
      releaseStartingLine(SHOP),
      'Release v17 starting (sha256 3f9a2b7c1d4e, flow shop)',
    ],
    [
      releaseRunningLine(SHOP, 16),
      'Release v17 running (sha256 3f9a2b7c1d4e, flow shop, was v16)',
    ],
    [
      releaseRunningLine(SHOP),
      'Release v17 running (sha256 3f9a2b7c1d4e, flow shop)',
    ],
    [
      releaseRefusedLine({ check: 'artifact-sha256', sequence: 17 }),
      'Release v17 refused (artifact-sha256)',
    ],
    [
      releaseRefusedLine({
        check: 'secret-missing',
        sequence: 17,
        names: ['SALT', 'API_KEY'],
      }),
      'Release v17 refused (secret-missing: SALT, API_KEY)',
    ],
    [
      releaseRefusedLine({
        check: 'secret-in-env',
        sequence: 17,
        names: ['API_KEY'],
      }),
      'Release v17 refused (secret-in-env: API_KEY)',
    ],
    [
      releaseRefusedLine({
        check: 'secret-reserved',
        sequence: 17,
        names: ['NODE_OPTIONS', 'WALKEROS_X'],
      }),
      'Release v17 refused (secret-reserved: NODE_OPTIONS, WALKEROS_X)',
    ],
    [
      releaseRefusedLine({ check: 'document-format' }),
      'Release document refused (document-format)',
    ],
    [
      notReadyLine(17, 60_000),
      'Release v17 not ready within 60 s, refused on this instance',
    ],
    [
      exitedBeforeReadyLine(17, { code: 1, signal: null }),
      'Release v17 exited before it was ready (code 1), refused on this instance',
    ],
    [startingAgainLine(16), 'Release v16 starting again'],
    [
      skippedLine(16),
      'Release v16 skipped (the app does not serve its walkerOS secrets)',
    ],
    [
      crashLine(17, { code: 1, signal: null }, 2000),
      'Release v17 exited (code 1), starting it again in 2 s',
    ],
    [
      crashLine(17, { code: null, signal: 'SIGKILL' }, 60_000),
      'Release v17 exited (signal SIGKILL), starting it again in 60 s',
    ],
    [
      noReleaseCanRunLine({ reason: 'secrets-changed', sequence: 17 }),
      'No release can run: v17 changed secret values and did not start; /ready answers 503',
    ],
    [
      noReleaseCanRunLine({ reason: 'no-good-release' }),
      'No release can run: no good release in the cache; /ready answers 503',
    ],
    [
      noReleaseCanRunLine({ reason: 'secrets-need-app', sequence: 17 }),
      'No release can run: the walkerOS secrets of v17 need the app; /ready answers 503',
    ],
    [
      noReleaseToRunLine('no-release'),
      'No release to run: the cache is empty and the app names no release',
    ],
    [
      noReleaseToRunLine('no-answer'),
      'No release to run: the cache is empty and the app did not answer',
    ],
    [
      checkInRefusedLine(401, 300_000),
      'Check-in refused (401), serving on; next check-in in 5 min',
    ],
    [
      checkInRefusedLine(403, 318_420),
      'Check-in refused (403), serving on; next check-in in 5 min',
    ],
    [
      checkInFailedLine('timeout', 48_000),
      'Check-in failed (timeout), serving on; next check-in in 48 s',
    ],
    [
      checkInFailedLine('503', 47_300),
      'Check-in failed (503), serving on; next check-in in 48 s',
    ],
    [checkInAnsweredLine(), 'Check-in answered again'],
    [
      documentNotFetchedLine('timeout'),
      'Release document not fetched (timeout)',
    ],
    [
      documentRefusedByLine('app', 401),
      'Release document refused by the app (401)',
    ],
    [
      releaseRefusedByLine(17, 'archive', 'app', 403),
      'Release v17 archive refused by the app (403)',
    ],
    [
      releaseRefusedByLine(17, 'archive', 'storage', 403),
      'Release v17 archive refused by storage (403)',
    ],
    [
      releaseRefusedByLine(17, 'walkerOS secrets', 'app', 401),
      'Release v17 walkerOS secrets refused by the app (401)',
    ],
    [
      releaseNotFetchedLine(17, 'archive', '403'),
      'Release v17 archive not fetched (403)',
    ],
    [
      releaseNotFetchedLine(17, 'walkerOS secrets', 'transport'),
      'Release v17 walkerOS secrets not fetched (transport)',
    ],
    [
      notStartedLine(
        17,
        'Heap 36 MB for the flow is below the 64 MB minimum: three quarters of 128 MB granted, less 60 MB for the supervisor',
      ),
      'Release v17 not started on this instance: Heap 36 MB for the flow is below the 64 MB minimum: three quarters of 128 MB granted, less 60 MB for the supervisor',
    ],
    [
      restartNotReadyLine(17, 60_000, 4000),
      'Release v17 not ready within 60 s after a restart, starting it again in 4 s',
    ],
    [
      restartNotStartedLine(17, 'extraction refused (artifact-sha256)', 2000),
      'Release v17 not started on this instance: extraction refused (artifact-sha256); starting it again in 2 s',
    ],
    [
      notStartedLine(17, 'ENOSPC: no space left on device, write'),
      'Release v17 not started on this instance: ENOSPC: no space left on device, write',
    ],
    [
      cachedArtifactRemovedLine(SHA),
      'Cached artifact sha256 3f9a2b7c1d4e failed its check and was removed',
    ],
    [
      cachedDocumentSkippedLine(SHA, 'document-format'),
      'Cached release document sha256 3f9a2b7c1d4e skipped (document-format)',
    ],
    [
      cachedDocumentSkippedLine(SHA, 'document-version'),
      'Cached release document sha256 3f9a2b7c1d4e skipped (document-version)',
    ],
  ])('%s', (line, copy) => {
    expect(line).toBe(copy);
    expect(redactLine(line)).toBe(line);
  });
});
