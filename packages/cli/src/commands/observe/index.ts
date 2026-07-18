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

// === Programmatic API ===

export interface StartObserveSessionOptions {
  projectId?: string;
  flowId: string;
  /** Flow settings name; the current mint contract requires it. */
  settingsName: string;
  /** Replace an existing active session for the flow (`--replace`). */
  force?: boolean;
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
    ...(options.force ? { force: true } : {}),
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

/**
 * Poll GET until the session leaves `arming` (or the deadline passes). Always
 * runs at least one GET: the mint response never carries the web/server parts,
 * the app assembles them on GET once provisioning settles. Session liveness is
 * server-managed - abandoning this poll never ends the session.
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
    const session = await getObserveSession(options);
    if (session.status !== 'arming' || Date.now() >= deadline) return session;
    await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs));
  }
}

// === Rendering ===

export interface FormatObserveSessionResult {
  /** Machine-readable stdout payload: the live server endpoint, when armed. */
  stdoutLast: string | null;
  stderr: string;
}

/**
 * Render a session from the fields the CURRENT API contract actually carries.
 * The web activation link is app-minted (grants are app-signed and
 * origin-bound), so the CLI never builds one from the raw token; it points at
 * the app's Observe window instead.
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
    lines.push(`    Preview:    ${session.web.previewId}`);
    lines.push(`    Token:      ${session.web.token}`);
    lines.push(`    Bundle URL: ${session.web.bundleUrl}`);
    lines.push(
      session.web.previewEnabled
        ? '    Activate:   open the Observe window in the app to mint the activation link (app-signed; the CLI cannot build it from the token)'
        : '    Activate:   not available: the deployed web bundle cannot verify activation grants (redeploy the web flow first)',
    );
  } else {
    lines.push(`  Web: no web part${arming ? ' yet (still arming)' : ''}`);
  }
  lines.push('');

  if (session.serverEndpoint) {
    lines.push('  Server');
    if (session.serverFlowName) {
      lines.push(`    Flow:       ${session.serverFlowName}`);
    }
    lines.push(`    Endpoint:   ${session.serverEndpoint}`);
  } else {
    lines.push(
      `  Server: no live endpoint${arming ? ' yet (still arming)' : ''}`,
    );
  }
  lines.push('');
  lines.push(
    '  The session lives server-side; closing this terminal does not end it.',
  );

  return {
    stdoutLast: session.serverEndpoint ?? null,
    stderr: lines.join('\n'),
  };
}

// === CLI Command ===

export interface ObserveStartCommandOptions extends GlobalOptions {
  project?: string;
  /** Flow settings name; auto-resolved when the flow has exactly one. */
  flow?: string;
  /** Reserved for a later contract; the current mint body has no level field. */
  level?: string;
  /** Maps onto the current contract's `force` field. */
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

    if (options.level !== undefined) {
      process.stderr.write(
        'Note: --level is not supported by the current API contract; starting without it.\n',
      );
    }

    // Validate --timeout before any network call: a NaN deadline would make
    // the poll loop never expire, and a session should not be minted for an
    // invalid flag (the previews validate-before-create precedent).
    let timeoutSeconds = DEFAULT_WAIT_SECONDS;
    if (options.timeout !== undefined) {
      timeoutSeconds = parseInt(options.timeout, 10);
      if (Number.isNaN(timeoutSeconds) || timeoutSeconds < 0) {
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
      force: options.replace === true,
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
