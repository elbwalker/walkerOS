import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  setDefaultProject,
  getDefaultProject,
  listAllFlows,
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
  listPreviews,
  getPreview,
  createPreview,
  deletePreview,
  regrantPreview,
  listSecrets,
  createSecret,
  updateSecret,
  deleteSecret,
  deploy,
  listDeployments,
  getDeploymentBySlug,
  deleteDeployment,
  listJourneys,
  startObserveSession,
  getObserveSession,
  endObserveSession,
  requestDeviceCode,
  pollForToken,
  whoami,
  resolveToken,
  resolveAppUrl,
  deleteConfig,
  feedback,
  getFeedbackPreference,
  setFeedbackPreference,
} from '@walkeros/cli';
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

import type {
  ToolClient,
  JourneysResult,
  RegrantPreviewOptions,
  ObserveSessionResult,
  ObserveSessionRef,
  StartObserveSessionOptions,
} from './tool-client.js';

/**
 * Default ToolClient implementation backed by @walkeros/cli. Every method
 * delegates to the CLI's programmatic API, which in turn talks to the
 * walkerOS app over HTTPS via openapi-fetch. Token resolution and the
 * base URL come from the CLI's config file and environment
 * (WALKEROS_TOKEN, WALKEROS_APP_URL), so no constructor args are required.
 */
export class HttpToolClient implements ToolClient {
  async listProjects(options?: {
    cursor?: string;
    limit?: number;
  }): Promise<unknown> {
    return listProjects(options);
  }
  async getProject(options: { projectId?: string }): Promise<unknown> {
    return getProject(options);
  }
  async createProject(options: { name: string }): Promise<unknown> {
    return createProject(options);
  }
  async updateProject(options: {
    projectId?: string;
    name: string;
  }): Promise<unknown> {
    return updateProject(options);
  }
  async deleteProject(options: { projectId?: string }): Promise<unknown> {
    return deleteProject(options);
  }
  setDefaultProject(projectId: string): void {
    setDefaultProject(projectId);
  }
  getDefaultProject(): string | null {
    return getDefaultProject();
  }

  async listAllFlows(options?: {
    sort?: string;
    order?: 'asc' | 'desc';
    includeDeleted?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<unknown> {
    return listAllFlows(options as Parameters<typeof listAllFlows>[0]);
  }
  async listFlows(options: ListFlowsOptions): Promise<unknown> {
    return listFlows(options);
  }
  async getFlow(options: {
    flowId: string;
    projectId?: string;
    fields?: string[];
  }): Promise<unknown> {
    return getFlow(options);
  }
  async createFlow(options: {
    name: string;
    content: Record<string, unknown>;
    projectId?: string;
  }): Promise<unknown> {
    return createFlow(options);
  }
  async updateFlow(options: {
    flowId: string;
    projectId?: string;
    name?: string;
    content?: Record<string, unknown>;
    mergePatch?: boolean;
  }): Promise<unknown> {
    return updateFlow(options);
  }
  async deleteFlow(options: {
    flowId: string;
    projectId?: string;
  }): Promise<unknown> {
    return deleteFlow(options);
  }
  async duplicateFlow(options: {
    flowId: string;
    name?: string;
    projectId?: string;
  }): Promise<unknown> {
    return duplicateFlow(options);
  }

  async listPreviews(options: ListPreviewsOptions): Promise<unknown> {
    return listPreviews(options);
  }
  async getPreview(options: GetPreviewOptions): Promise<unknown> {
    return getPreview(options);
  }
  async createPreview(
    options: CreatePreviewOptions & { siteUrl?: string },
  ): Promise<unknown> {
    // flow-manage passes `siteUrl` (the shared handler's field); the CLI's
    // createPreview mints an origin-bound grant when given `url`. Bridge the two
    // so a preview_create with a site URL over the HTTP client mints a real
    // grant instead of returning a null activationUrl.
    return createPreview({ ...options, url: options.url ?? options.siteUrl });
  }
  async deletePreview(options: DeletePreviewOptions): Promise<unknown> {
    return deletePreview(options);
  }
  async regrantPreview(options: RegrantPreviewOptions): Promise<unknown> {
    return regrantPreview(options);
  }

  async listSecrets(options: ListSecretsOptions): Promise<unknown> {
    return listSecrets(options);
  }
  async createSecret(options: CreateSecretOptions): Promise<unknown> {
    return createSecret(options);
  }
  async updateSecret(options: UpdateSecretOptions): Promise<unknown> {
    return updateSecret(options);
  }
  async deleteSecret(options: DeleteSecretOptions): Promise<unknown> {
    return deleteSecret(options);
  }

  async deploy(options: DeployOptions): Promise<unknown> {
    return deploy(options);
  }
  async listDeployments(options: ListDeploymentsOptions): Promise<unknown> {
    return listDeployments(options);
  }
  async getDeploymentBySlug(options: {
    slug: string;
    projectId?: string;
  }): Promise<unknown> {
    return getDeploymentBySlug(options);
  }
  async deleteDeployment(options: {
    slug: string;
    projectId?: string;
  }): Promise<unknown> {
    return deleteDeployment(options);
  }

  async listJourneys(options: {
    flowId: string;
    projectId?: string;
    traceId?: string;
    limit?: number;
  }): Promise<JourneysResult> {
    return listJourneys(options);
  }

  /**
   * Observe session lifecycle over the CLI's authenticated boundary. The trio
   * routes through the same `apiFetch` as every other method here, so token
   * resolution, base URL, and `ApiError` shaping (which `isAuthError` reads)
   * stay identical to the rest of the client.
   */
  async startObserveSession(
    options: StartObserveSessionOptions,
  ): Promise<ObserveSessionResult> {
    return startObserveSession(options);
  }
  async getObserveSession(
    options: ObserveSessionRef,
  ): Promise<ObserveSessionResult> {
    return getObserveSession(options);
  }
  async endObserveSession(options: ObserveSessionRef): Promise<void> {
    return endObserveSession(options);
  }

  async requestDeviceCode(): Promise<DeviceCodeResult> {
    return requestDeviceCode();
  }
  async pollForToken(
    deviceCode: string,
    options?: { timeoutMs?: number },
  ): Promise<PollResult> {
    return pollForToken(deviceCode, options);
  }
  async whoami(): Promise<unknown> {
    return whoami();
  }
  resolveToken(): { token: string; source: 'env' | 'config' } | null {
    return resolveToken();
  }
  deleteConfig(): boolean {
    return deleteConfig();
  }

  /**
   * Unauthenticated reachability probe of the app's PUBLIC `/api/health`
   * route. Uses a plain `fetch` (no `createApiClient`, which throws when no
   * token is set) so diagnostics works logged-out. Resolves
   * `{ reachable: false }` only on a real network/timeout failure.
   */
  async checkHealth(): Promise<{
    reachable: boolean;
    status?: string;
    version?: string;
  }> {
    try {
      const res = await fetch(`${resolveAppUrl()}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      // A non-2xx status still means the app is reachable; only network or
      // timeout errors (the catch below) mark it unreachable.
      const body: unknown = await res.json().catch(() => undefined);
      const result: { reachable: boolean; status?: string; version?: string } =
        { reachable: true };
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        if (typeof record.status === 'string') result.status = record.status;
        if (typeof record.version === 'string') result.version = record.version;
      }
      return result;
    } catch {
      return { reachable: false };
    }
  }

  async submitFeedback(text: string, options?: FeedbackOptions): Promise<void> {
    await feedback(text, options);
  }
  getFeedbackPreference(): boolean | undefined {
    return getFeedbackPreference();
  }
  setFeedbackPreference(anonymous: boolean): void {
    setFeedbackPreference(anonymous);
  }
}
