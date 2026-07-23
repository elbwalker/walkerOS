import { requireProjectId } from '../../core/auth.js';
import { apiFetch } from '../../core/http.js';
import { handleCliError, throwApiResponseError } from '../../core/api-error.js';
import { writeResult } from '../../core/output.js';
import { resolveToken } from '../../lib/config-file.js';
import type { GlobalOptions } from '../../types/global.js';
import type { components } from '../../types/api.gen.js';
import { getFlow } from '../flows/index.js';

type ObserveSessionResponse = components['schemas']['ObserveSessionResponse'];
type CreateObserveSessionRequest =
  components['schemas']['CreateObserveSessionRequest'];
type ObserveLevel = components['schemas']['ObserveLevel'];

const OBSERVE_LEVELS: readonly ObserveLevel[] = ['off', 'standard', 'trace'];

function isObserveLevel(value: string): value is ObserveLevel {
  return (OBSERVE_LEVELS as readonly string[]).includes(value);
}

// === Programmatic API ===

export interface StartObserveSessionOptions {
  projectId?: string;
  flowId: string;
  /** Flow settings name; the mint contract requires it. */
  settingsName: string;
  /** Replace an existing active session for the flow (`--replace`). */
  replace?: boolean;
  /** Observation detail level for the session. */
  level?: ObserveLevel;
  /** Origins the session's web activation grant may activate on. */
  origins?: string[];
}

/**
 * Mint an observe session via the app's authenticated boundary. Thin client:
 * the app validates topology, inserts the row, and provisions detached; the
 * mint response comes back immediately (usually `arming`, with the web and
 * server parts still null - GET assembles them once the session settles).
 */
export async function startObserveSession(
  options: StartObserveSessionOptions,
): Promise<ObserveSessionResponse> {
  const pid = options.projectId ?? requireProjectId();
  const body: CreateObserveSessionRequest = {
    settingsName: options.settingsName,
    ...(options.replace ? { replace: true } : {}),
    ...(options.level !== undefined ? { level: options.level } : {}),
    // An empty list carries no origin the grant could bind to, so it is
    // omitted rather than sent as a bare [] the app would have to interpret.
    ...(options.origins?.length ? { origins: options.origins } : {}),
  };
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/observe-sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throwApiResponseError(
      response,
      errorBody,
      'Failed to start observe session',
    );
  }
  return response.json();
}

export interface GetObserveSessionOptions {
  projectId?: string;
  flowId: string;
  sessionId: string;
}

export async function getObserveSession(
  options: GetObserveSessionOptions,
): Promise<ObserveSessionResponse> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/observe-sessions/${options.sessionId}`,
  );
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throwApiResponseError(response, errorBody, 'Failed to get observe session');
  }
  return response.json();
}

export interface EndObserveSessionOptions {
  projectId?: string;
  flowId: string;
  sessionId: string;
}

/**
 * End a session through the app's authenticated boundary: the app tears down
 * the container, revokes credentials, deletes the web preview, and drops the
 * row. Ends the WHOLE session including every attached arm. Idempotent
 * app-side, and the 204 carries no body, so this resolves with nothing; a
 * session scoped to another flow or project is a 404, never a cross-tenant end.
 */
export async function endObserveSession(
  options: EndObserveSessionOptions,
): Promise<void> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiFetch(
    `/api/projects/${pid}/flows/${options.flowId}/observe-sessions/${options.sessionId}`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throwApiResponseError(response, errorBody, 'Failed to end observe session');
  }
}

/**
 * POST the session heartbeat, swallowing every failure. The heartbeat extends
 * the janitor's idle grace while the CLI user is actively setting up - it
 * never gates anything, so an unreachable app or a 5xx must not surface into
 * the poll loop. Session liveness never depends on this process.
 */
export async function heartbeatObserveSession(options: {
  projectId?: string;
  flowId: string;
  sessionId: string;
}): Promise<void> {
  const pid = options.projectId ?? requireProjectId();
  try {
    await apiFetch(
      `/api/projects/${pid}/flows/${options.flowId}/observe-sessions/${options.sessionId}/heartbeat`,
      { method: 'POST' },
    );
  } catch {
    // Best-effort by design; the next tick tries again.
  }
}

/**
 * Poll GET until the session leaves `arming` (or the deadline passes). Always
 * runs at least one GET: the mint response never carries the web/server parts,
 * the app assembles them on GET once provisioning settles. Each tick also
 * heartbeats the session so the janitor's idle reaper cannot claim it while
 * the user is actively waiting; the heartbeat extends grace, never gates
 * (failures are swallowed). Session liveness is server-managed - abandoning
 * this poll never ends the session.
 */
export async function waitForObserveSessionSettled(options: {
  projectId?: string;
  flowId: string;
  sessionId: string;
  timeoutMs: number;
  pollIntervalMs: number;
}): Promise<ObserveSessionResponse> {
  const deadline = Date.now() + options.timeoutMs;
  for (;;) {
    await heartbeatObserveSession(options);
    const session = await getObserveSession(options);
    const remainingMs = deadline - Date.now();
    if (session.status !== 'arming' || remainingMs <= 0) return session;
    // Cap the sleep to the remaining budget so the deadline is honored
    // precisely instead of overshooting by up to a full poll interval.
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(options.pollIntervalMs, remainingMs)),
    );
  }
}

// === Rendering ===

export interface FormatObserveSessionResult {
  /** Machine-readable stdout payload: the live server endpoint, when armed. */
  stdoutLast: string | null;
  stderr: string;
}

/**
 * Render a session from the fields the API contract carries. The web
 * activation URL is app-minted (grants are app-signed and origin-bound) and
 * already rides the `elbObserve` credential companion, so the CLI echoes it
 * verbatim and never builds one client-side. The server part is read from
 * `server.endpoint`/`server.env` (the transitional top-level `serverEndpoint`
 * mirror is not consumed).
 */
export function formatObserveSession(
  session: ObserveSessionResponse,
): FormatObserveSessionResult {
  const arming = session.status === 'arming';
  const lines = [`Observe session ${session.id} (${session.status})`];
  if (session.errorMessage) lines.push(`  Error: ${session.errorMessage}`);
  lines.push('');

  if (session.web) {
    lines.push('  Web');
    lines.push(`    Bundle URL: ${session.web.bundleUrl}`);
    lines.push(`    Credential: ${session.web.credential}`);
    if (session.web.activationUrl) {
      // App-minted, origin-bound; carries the elbObserve companion so the
      // observed tab picks up the session credential from the link itself.
      lines.push(`    Activate:   ${session.web.activationUrl}`);
    } else if (session.web.previewEnabled) {
      lines.push(
        `    Activate:   no activation link minted yet${arming ? ' (still arming)' : ''}; open the Observe window in the app to mint one`,
      );
    } else {
      lines.push(
        '    Activate:   not available: the deployed web bundle cannot verify activation grants (redeploy the web flow first)',
      );
    }
  } else {
    lines.push(`  Web: no web part${arming ? ' yet (still arming)' : ''}`);
  }
  lines.push('');

  if (session.server) {
    lines.push('  Server');
    if (session.serverFlowName) {
      lines.push(`    Flow:       ${session.serverFlowName}`);
    }
    lines.push(
      session.server.endpoint
        ? `    Endpoint:   ${session.server.endpoint}`
        : `    Endpoint:   not live${arming ? ' yet (still arming)' : ''}`,
    );
    // The env trio is the session's own identity: export it into a server
    // runtime to feed this exact session.
    lines.push('    Env:');
    lines.push(
      `      WALKEROS_OBSERVER_URL=${session.server.env.WALKEROS_OBSERVER_URL}`,
    );
    lines.push(
      `      WALKEROS_DEPLOYMENT_ID=${session.server.env.WALKEROS_DEPLOYMENT_ID}`,
    );
    lines.push(
      `      WALKEROS_INGEST_TOKEN=${session.server.env.WALKEROS_INGEST_TOKEN}`,
    );
  } else {
    lines.push(
      `  Server: no server part${arming ? ' yet (still arming)' : ''}`,
    );
  }
  lines.push('');
  lines.push(`  Expires:  ${session.expiresAt}`);
  lines.push(`  Records:  ${session.recordsReceived}`);
  lines.push('');
  lines.push(
    '  The session lives server-side; closing this terminal does not end it.',
  );
  lines.push(
    '  Sessions idle out server-side when no tab or traffic keeps them alive.',
  );

  return {
    stdoutLast: session.server?.endpoint ?? null,
    stderr: lines.join('\n'),
  };
}

// === CLI Command ===

export interface ObserveStartCommandOptions extends GlobalOptions {
  project?: string;
  /** Flow settings name; auto-resolved when the flow has exactly one. */
  flow?: string;
  /** Observation detail level: off, standard, or trace. */
  level?: string;
  /** Maps onto the contract's `replace` field. */
  replace?: boolean;
  /** Wait for the session to settle (default true; `--no-wait` disables). */
  wait?: boolean;
  /** Seconds to wait for the session to settle (default 300). */
  timeout?: string;
  json?: boolean;
  /** Test seam: poll cadence while waiting (default 3000ms). */
  pollIntervalMs?: number;
}

const DEFAULT_WAIT_SECONDS = 300;
const DEFAULT_POLL_INTERVAL_MS = 3000;

/**
 * The login/signup funnel for terminal-native users: a start with NO
 * resolvable credentials at all is a CTA naming the next command, never a
 * hard error wall (exit stays 0, no network call). A request that fails 401
 * despite a token (stale/invalid credentials, the CI case) is NOT this
 * funnel: it goes through `handleCliError` so scripts fail loudly instead of
 * reading success-with-empty-stdout.
 */
function printLoginCta(): void {
  process.stderr.write(
    [
      'Not logged in.',
      '',
      'Starting an observe session needs a walkerOS account.',
      '  1. Run: walkeros auth login   (opens the browser; creates your account if you do not have one)',
      '  2. Re-run: walkeros observe start <flowId>',
      '',
    ].join('\n') + '\n',
  );
}

/** Resolve the settings name when the flow has exactly one settings entry. */
async function resolveSingleSettingsName(options: {
  projectId: string;
  flowId: string;
}): Promise<string> {
  const flow = await getFlow(options);
  const settings = flow.settings ?? [];
  const only = settings[0];
  if (!only) throw new Error('Flow has no settings.');
  if (settings.length > 1) {
    throw new Error(
      `This flow has multiple settings. Use --flow <name> to specify one.\nAvailable: ${settings.map((entry) => entry.name).join(', ')}`,
    );
  }
  return only.name;
}

export async function observeStartCommand(
  flowId: string,
  options: ObserveStartCommandOptions,
): Promise<void> {
  try {
    // No credentials at all: funnel straight to login, no network round trip.
    if (!resolveToken()?.token) {
      printLoginCta();
      return;
    }

    // Validate flags BEFORE any network call: a session should not be minted
    // for an invalid flag (the previews validate-before-create precedent).
    let level: ObserveLevel | undefined;
    if (options.level !== undefined) {
      if (!isObserveLevel(options.level)) {
        throw new Error(
          `Invalid --level value: ${options.level} (expected ${OBSERVE_LEVELS.join(', ')})`,
        );
      }
      level = options.level;
    }

    // An invalid deadline would make the poll loop never expire. Full-string
    // numeric parse, not parseInt: `5m` must error loudly, not silently
    // truncate to 5 seconds.
    let timeoutSeconds = DEFAULT_WAIT_SECONDS;
    if (options.timeout !== undefined) {
      const rawTimeout = options.timeout.trim();
      timeoutSeconds = rawTimeout === '' ? Number.NaN : Number(rawTimeout);
      if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 0) {
        throw new Error(
          `Invalid --timeout value: ${options.timeout} (expected a non-negative number of seconds)`,
        );
      }
    }

    const projectId = options.project ?? requireProjectId();
    const settingsName =
      options.flow ?? (await resolveSingleSettingsName({ projectId, flowId }));

    let session = await startObserveSession({
      projectId,
      flowId,
      settingsName,
      ...(options.replace === true ? { replace: true } : {}),
      ...(level !== undefined ? { level } : {}),
    });

    // Always at least one GET when waiting: even a session born live gets its
    // web/server parts assembled by GET, never by the mint response.
    let timedOut = false;
    if (options.wait !== false) {
      session = await waitForObserveSessionSettled({
        projectId,
        flowId,
        sessionId: session.id,
        timeoutMs: timeoutSeconds * 1000,
        pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
      });
      // The poll loop only hands back an `arming` session when the deadline
      // passed. `--no-wait` rendering an arming mint stays a clean exit (the
      // user opted out of waiting); an expired wait must not read as success.
      timedOut = session.status === 'arming';
    }

    if (options.json) {
      await writeResult(JSON.stringify(session, null, 2), {});
    } else {
      const { stdoutLast, stderr } = formatObserveSession(session);
      process.stderr.write(stderr + '\n');
      if (stdoutLast) process.stdout.write(stdoutLast + '\n');
    }

    // exitCode over process.exit: the rendered output above still flushes and
    // the process ends non-zero for CI to branch on.
    if (timedOut) {
      process.stderr.write(
        `Timed out after ${timeoutSeconds}s: the session is still arming. It keeps arming server-side; check it in the app or re-run walkeros observe start.\n`,
      );
      process.exitCode = 1;
    }
    if (session.status === 'failed') process.exitCode = 1;
  } catch (error) {
    handleCliError(error);
  }
}
