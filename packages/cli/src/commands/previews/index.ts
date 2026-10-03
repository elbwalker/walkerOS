import { requireProjectId } from '../../core/auth.js';
import { apiRequest } from '../../core/api-request.js';
import type { ApiRequestInit, ResponseJson } from '../../core/api-request.js';
import { throwApiError } from '../../core/api-error.js';
import { getFlow } from '../flows/index.js';

type PreviewResponse = ResponseJson<
  'GET /api/projects/{projectId}/flows/{flowId}/previews/{previewId}',
  200
>;
type CreatePreviewBody =
  ApiRequestInit<'POST /api/projects/{projectId}/flows/{flowId}/previews'>['body'];
type MintGrantResponse = ResponseJson<
  'POST /api/projects/{projectId}/flows/{flowId}/previews/{previewId}/grant',
  200
>;

// === Programmatic API ===

export interface ListPreviewsOptions {
  projectId?: string;
  flowId: string;
}

export async function listPreviews(
  options: ListPreviewsOptions,
): Promise<
  ResponseJson<'GET /api/projects/{projectId}/flows/{flowId}/previews', 200>
> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'GET /api/projects/{projectId}/flows/{flowId}/previews',
    { path: { projectId: pid, flowId: options.flowId } },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to list previews');
  }
  return response.json();
}

export interface GetPreviewOptions {
  projectId?: string;
  flowId: string;
  previewId: string;
}

export async function getPreview(
  options: GetPreviewOptions,
): Promise<PreviewResponse> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'GET /api/projects/{projectId}/flows/{flowId}/previews/{previewId}',
    {
      path: {
        projectId: pid,
        flowId: options.flowId,
        previewId: options.previewId,
      },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to get preview');
  }
  return response.json();
}

export interface CreatePreviewOptions {
  projectId?: string;
  flowId: string;
  flowName?: string;
  flowSettingsId?: string;
  /** What the preview should run: the flow's draft (default) or a deployed
   *  version's stored config. Anchored to the generated API contract so a new
   *  request field becomes a type error here rather than silent drift. */
  source?: NonNullable<CreatePreviewBody>['source'];
  /** Target site URL. When present, the CLI asks the server to re-mint an
   *  origin-bound activation grant for this URL's origin. Grants are
   *  app-signed and origin-bound, so a client cannot forge a working activation
   *  URL for an arbitrary origin by string-appending a token — only the server
   *  can mint one. The returned preview's `activationUrl` is the grant URL for
   *  this origin. */
  url?: string;
}

export async function createPreview(
  options: CreatePreviewOptions,
): Promise<PreviewResponse> {
  const pid = options.projectId ?? requireProjectId();

  // Derive (and validate) the target origin up front so an invalid --url fails
  // before we create a server-side preview, which would otherwise waste a quota
  // slot and force manual cleanup.
  let origin: string | undefined;
  if (options.url !== undefined) {
    try {
      origin = new URL(options.url).origin;
    } catch {
      throw new Error(`Invalid --url value: ${options.url}`);
    }
  }

  let settingsId = options.flowSettingsId;
  if (!settingsId) {
    if (!options.flowName) {
      throw new Error('Either flowName or flowSettingsId is required');
    }
    // Resolve flow settings name → id (same pattern deploy uses)
    const flow = await getFlow({ projectId: pid, flowId: options.flowId });
    const settings = (
      flow as { settings?: Array<{ id: string; name: string }> }
    ).settings;
    const match = settings?.find((s) => s.name === options.flowName);
    if (!match) {
      throw new Error(
        `Flow settings named "${options.flowName}" not found on flow ${options.flowId}`,
      );
    }
    settingsId = match.id;
  }

  const response = await apiRequest(
    'POST /api/projects/{projectId}/flows/{flowId}/previews',
    {
      path: { projectId: pid, flowId: options.flowId },
      body: {
        flowSettingsId: settingsId,
        ...(options.source ? { source: options.source } : {}),
      },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to create preview');
  }
  const created: ResponseJson<
    'POST /api/projects/{projectId}/flows/{flowId}/previews',
    201
  > = await response.json();

  // No target URL: the create response already carries a valid grant-based
  // activationUrl for the flow's default/configured origin. Return it as-is.
  if (origin === undefined) return created;

  // Target URL given: re-mint an origin-bound grant for that origin. The
  // server signs the grant; the CLI cannot produce a valid one client-side.
  const grantResponse = await apiRequest(
    'POST /api/projects/{projectId}/flows/{flowId}/previews/{previewId}/grant',
    {
      path: { projectId: pid, flowId: options.flowId, previewId: created.id },
      body: { origins: [origin] },
    },
  );
  if (!grantResponse.ok) {
    const body = await grantResponse.json().catch(() => ({}));
    // The preview already exists at this point. A failed mint must name it,
    // or the caller has no handle to delete the orphan or retry the mint.
    try {
      throwApiError(body, 'Failed to mint preview activation grant');
    } catch (error) {
      if (error instanceof Error) {
        error.message += ` (preview ${created.id} was created but has no working activation URL; delete it or mint a grant with regrantPreview)`;
      }
      throw error;
    }
  }
  const grant: MintGrantResponse = await grantResponse.json();
  return { ...created, activationUrl: grant.activationUrl };
}

export interface RegrantPreviewOptions {
  projectId?: string;
  flowId: string;
  previewId: string;
  /** Bare `https://host[:port]` origins the grant may activate on; the
   *  returned `activationUrl` targets the first. */
  origins: string[];
  /** Observe session id — binds the minted grant to that session so
   *  forwarded events reach its container. Opaque to the CLI. */
  sessionId?: string;
}

/**
 * Mint a fresh, origin-bound activation grant for an existing preview.
 * Grants are app-signed and origin-bound, so a client cannot forge a working
 * activation URL by string-appending a token — only the server can mint one.
 */
export async function regrantPreview(
  options: RegrantPreviewOptions,
): Promise<MintGrantResponse> {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'POST /api/projects/{projectId}/flows/{flowId}/previews/{previewId}/grant',
    {
      path: {
        projectId: pid,
        flowId: options.flowId,
        previewId: options.previewId,
      },
      body: {
        origins: options.origins,
        ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to mint preview activation grant');
  }
  return response.json();
}

export interface DeletePreviewOptions {
  projectId?: string;
  flowId: string;
  previewId: string;
}

export async function deletePreview(options: DeletePreviewOptions) {
  const pid = options.projectId ?? requireProjectId();
  const response = await apiRequest(
    'DELETE /api/projects/{projectId}/flows/{flowId}/previews/{previewId}',
    {
      path: {
        projectId: pid,
        flowId: options.flowId,
        previewId: options.previewId,
      },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(body, 'Failed to delete preview');
  }
  // App returns 204 No Content on success; older surfaces may return JSON.
  // Always resolve to a record so every consumer (MCP, CLI command) gets a
  // serializable confirmation instead of a bare null.
  const confirmation = { deleted: true, previewId: options.previewId };
  if (response.status === 204) return confirmation;
  return (await response.json().catch(() => null)) ?? confirmation;
}
