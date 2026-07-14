import type {
  DeviceCodeResult,
  PollResult,
  ListFlowsOptions,
  DeployOptions,
  ListDeploymentsOptions,
  ListPreviewsOptions,
  GetPreviewOptions,
  CreatePreviewOptions,
  DeletePreviewOptions,
  ListSecretsOptions,
  CreateSecretOptions,
  UpdateSecretOptions,
  DeleteSecretOptions,
  FeedbackOptions,
} from '@walkeros/cli';
import type { Journey, JourneyGap } from '@walkeros/core';

/**
 * Mint a fresh, origin-bound activation grant for an existing preview. All
 * fields are opaque identifiers/strings — no host-internal shape leaks into
 * this public interface. `origins` are bare `https://host[:port]` values the
 * grant may activate on; the returned `activationUrl` targets the first.
 */
export interface RegrantPreviewOptions {
  projectId: string;
  flowId: string;
  previewId: string;
  origins: string[];
}

/**
 * The assembled cross-runtime journeys for a flow's active Observe session,
 * mirroring the app's flowId-keyed REST envelope. `sessionId` is null when the
 * flow has no active session (the empty result an agent gets when the flow is
 * not currently being observed). `journeys`/`gaps` are the pure
 * `assembleJourneys` output; typed against core's `Journey`/`JourneyGap` since
 * `@walkeros/mcp` already depends on `@walkeros/core`.
 */
export interface JourneysResult {
  sessionId: string | null;
  flowId: string;
  assembledAt: string;
  journeys: Journey[];
  gaps: JourneyGap[];
}

/**
 * Transport-agnostic client for network-reach MCP tools. The stdio build
 * plugs in HttpToolClient (talks to the walkerOS app over HTTPS via the
 * CLI's programmatic API). In-process hosts (e.g. the app itself) can plug
 * in a direct client that calls database helpers without HTTP overhead.
 */
export interface ToolClient {
  // Projects
  listProjects(options?: { cursor?: string; limit?: number }): Promise<unknown>;
  getProject(options: { projectId?: string }): Promise<unknown>;
  createProject(options: { name: string }): Promise<unknown>;
  updateProject(options: {
    projectId?: string;
    name: string;
  }): Promise<unknown>;
  deleteProject(options: { projectId?: string }): Promise<unknown>;
  setDefaultProject(projectId: string): void;
  getDefaultProject(): string | null;

  // Flows
  listAllFlows(options?: {
    sort?: string;
    order?: 'asc' | 'desc';
    includeDeleted?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<unknown>;
  listFlows(options: ListFlowsOptions): Promise<unknown>;
  getFlow(options: {
    flowId: string;
    projectId?: string;
    fields?: string[];
  }): Promise<unknown>;
  createFlow(options: {
    name: string;
    content: Record<string, unknown>;
    projectId?: string;
  }): Promise<unknown>;
  updateFlow(options: {
    flowId: string;
    projectId?: string;
    name?: string;
    content?: Record<string, unknown>;
    mergePatch?: boolean;
  }): Promise<unknown>;
  deleteFlow(options: { flowId: string; projectId?: string }): Promise<unknown>;
  duplicateFlow(options: {
    flowId: string;
    name?: string;
    projectId?: string;
  }): Promise<unknown>;

  // Previews
  listPreviews(options: ListPreviewsOptions): Promise<unknown>;
  getPreview(options: GetPreviewOptions): Promise<unknown>;
  // `siteUrl` is optional and host-specific: an in-process host can mint an
  // origin-bound activation grant for it at create time; the CLI-backed HTTP
  // client ignores it (create there always uses the flow's default host mint).
  createPreview(
    options: CreatePreviewOptions & { siteUrl?: string },
  ): Promise<unknown>;
  deletePreview(options: DeletePreviewOptions): Promise<unknown>;
  /**
   * Mint a fresh, origin-bound activation grant for an existing preview.
   * OPTIONAL: only in-process hosts (the walkerOS app itself) implement it; the
   * CLI-backed HTTP client omits it, and the flow_manage handler guards on its
   * presence before calling. Returns an already-redacted grant summary (never
   * the ingest token or project id).
   */
  regrantPreview?(options: RegrantPreviewOptions): Promise<unknown>;

  // Secrets (per-flow; metadata only, values are write-only)
  listSecrets(options: ListSecretsOptions): Promise<unknown>;
  createSecret(options: CreateSecretOptions): Promise<unknown>;
  updateSecret(options: UpdateSecretOptions): Promise<unknown>;
  deleteSecret(options: DeleteSecretOptions): Promise<unknown>;

  // Deployments
  deploy(options: DeployOptions): Promise<unknown>;
  listDeployments(options: ListDeploymentsOptions): Promise<unknown>;
  getDeploymentBySlug(options: {
    slug: string;
    projectId?: string;
  }): Promise<unknown>;
  deleteDeployment(options: {
    slug: string;
    projectId?: string;
  }): Promise<unknown>;

  // Observe: assembled journeys for a flow's active session. Resolves the
  // session from `flowId` app-side (`observe_sessions.flow_id` is UNIQUE); a
  // flow with no active session resolves to `sessionId: null` + empty journeys.
  listJourneys(options: {
    flowId: string;
    projectId?: string;
    traceId?: string;
    limit?: number;
  }): Promise<JourneysResult>;

  // Auth
  requestDeviceCode(): Promise<DeviceCodeResult>;
  pollForToken(
    deviceCode: string,
    options?: { timeoutMs?: number },
  ): Promise<PollResult>;
  whoami(): Promise<unknown>;
  resolveToken(): { token: string; source: 'env' | 'config' } | null;
  deleteConfig(): boolean;

  // Diagnostics: unauthenticated reachability probe of the app's public
  // `/api/health` route. Resolves `{ reachable: false }` only on a real
  // network/timeout failure, never on "not authenticated". Optional: clients
  // that cannot probe reachability (e.g. in-process hosts) may omit it, and
  // diagnostics degrades to `app.reachable: false`.
  checkHealth?(): Promise<{
    reachable: boolean;
    status?: string;
    version?: string;
  }>;

  // Feedback
  submitFeedback(text: string, options?: FeedbackOptions): Promise<void>;
  getFeedbackPreference(): boolean | undefined;
  setFeedbackPreference(anonymous: boolean): void;
}
