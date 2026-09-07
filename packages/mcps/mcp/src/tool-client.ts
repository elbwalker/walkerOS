import type {
  DeviceAuthorization,
  DeviceLoginResult,
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
import type { Journey, JourneyGap, JourneyUnattributed } from '@walkeros/core';

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
  /** Observe session id — binds the minted grant to that session so
   *  forwarded events reach its container. Opaque identifier. */
  sessionId?: string;
}

/**
 * The assembled cross-runtime journeys for a flow's active Observe session,
 * mirroring the app's flowId-keyed REST envelope. `sessionId` is null when the
 * flow has no active session (the empty result an agent gets when the flow is
 * not currently being observed). `journeys`/`gaps`/`unattributed` are the pure
 * `assembleJourneys` output; typed against core's `Journey`/`JourneyGap`/
 * `JourneyUnattributed` since `@walkeros/mcp` already depends on
 * `@walkeros/core`.
 */
export interface JourneysResult {
  sessionId: string | null;
  flowId: string;
  assembledAt: string;
  journeys: Journey[];
  gaps: JourneyGap[];
  /**
   * Records that belonged to an event run but could not be attributed to any
   * event, per platform. Absent when there are none, and session-level like
   * `gaps`: `traceId`/`limit` narrow `journeys` only.
   */
  unattributed?: JourneyUnattributed[];
}

/** Observation verbosity a session's container is provisioned with. */
export type ObserveLevel = 'off' | 'standard' | 'trace';

/**
 * The session's web part. Present once a preview arm is attached; null while
 * the window has no web half. `credential` and the server `env` trio are
 * connect secrets: the tool layer reads the part for arm presence and never
 * surfaces them.
 */
export interface ObserveSessionWebPart {
  activationUrl: string | null;
  credential: string;
  previewEnabled: boolean;
  bundleUrl: string;
  /** Observer both arms post to, in the field name a `config.observe` declares. */
  url?: string;
  /** Project binding the collector cross-checks an arriving credential against. */
  binding?: string;
}

/** The session's container part. Present once a container arm is provisioned. */
export interface ObserveSessionServerPart {
  endpoint: string | null;
  env: {
    WALKEROS_OBSERVER_URL: string;
    WALKEROS_DEPLOYMENT_ID: string;
    WALKEROS_INGEST_TOKEN: string;
  };
}

/**
 * One Observe session: a time-boxed window on a flow that runtimes attach to
 * as arms. `observedFlowName`/`serverFlowName` name the settings each arm runs;
 * `web`/`server` being non-null is what makes an arm attached. Mirrors the
 * app's session envelope.
 */
export interface ObserveSessionResult {
  id: string;
  projectId: string;
  flowId: string;
  status: string;
  errorMessage: string | null;
  observedFlowName: string | null;
  serverFlowName: string | null;
  web: ObserveSessionWebPart | null;
  server: ObserveSessionServerPart | null;
  expiresAt: string;
  recordsReceived: number;
  createdAt: string;
}

/**
 * Start a session on one flow. `settingsName` is the single knob the window is
 * opened on: the flow's topology under that name decides which arms the app
 * provisions, so the tool layer translates its arms input into this one field.
 */
export interface StartObserveSessionOptions {
  projectId: string;
  flowId: string;
  settingsName: string;
  origins?: string[];
  level?: ObserveLevel;
  replace?: boolean;
}

export interface ObserveSessionRef {
  projectId: string;
  flowId: string;
  sessionId: string;
}

// ---- Hub and frames wire shapes. Each mirrors one app response schema; the
// hosted door serializes through the same functions its routes use, the local
// door hands the parsed JSON through, so a tool sees one shape from both.

export type ThreadAnchorType =
  | 'step'
  | 'entity_action'
  | 'release'
  | 'contract'
  | 'tag';
export type StoredAnchorType = ThreadAnchorType | 'page';
export type ThreadStatus = 'open' | 'resolved';
export type ReleaseRef = { versionId: string } | { versionNumber: number };

export interface ReleaseRationaleSummaryWire {
  hasHumanText: boolean;
  hasGeneratedSummary: boolean;
  firstLine: string | null;
}

export interface FlowReleaseWire {
  id: string;
  deploymentId: string;
  deploymentSlug: string | null;
  deploymentType: string | null;
  versionNumber: number;
  flowVersionId: string | null;
  flowVersionNumber: number | null;
  status: string;
  source: string;
  errorCode: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByLabel: string | null;
  /** Present only on a read that asked for rationale. */
  rationale?: ReleaseRationaleSummaryWire | null;
}

export interface ReleaseIndexWire {
  releases: FlowReleaseWire[];
  total: number;
  limit: number;
  offset: number;
}

export interface VersionAnnotationWire {
  versionId: string;
  humanText: string | null;
  generatedSummary: string | null;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseDiffWire {
  prevVersionId: string;
  prevVersionNumber: number;
  text: string;
  contentIdentical: boolean;
}

export interface ReleaseDetailWire {
  versionId: string;
  versionNumber: number;
  contentHash: string | null;
  createdAt: string;
  createdBy: string;
  rationale: VersionAnnotationWire | null;
  diff: ReleaseDiffWire | null;
}

export interface StepHistoryEntryWire {
  versionId: string;
  versionNumber: number;
  createdAt: string;
  flow: string | null;
  change: 'added' | 'removed' | 'changed';
  humanText: string | null;
  generatedSummary: string | null;
}

export interface StepHistoryWire {
  step: string;
  flow: string | null;
  entries: StepHistoryEntryWire[];
  scanned: number;
  truncated: boolean;
  entriesTruncated: boolean;
  knownSteps?: string[];
}

export interface HubMessageWire {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface HubThreadWire {
  id: string;
  anchorType: ThreadAnchorType;
  anchorKey: string;
  anchorLabel: string;
  status: ThreadStatus;
  resolvedByVersionId: string | null;
  resolvedByVersionNumber: number | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages?: HubMessageWire[];
  hasMoreMessages?: boolean;
}

export interface ListThreadsWire {
  threads: HubThreadWire[];
  hasMoreThreads: boolean;
}

export type KnowledgeValidityWire =
  | {
      tier: 'release';
      versionId: string;
      versionNumber: number;
      promoted: boolean;
    }
  | { tier: 'draft'; versionId?: string }
  | { tier: 'none' };

export interface KnowledgeAuthorWire {
  kind: 'user' | 'preview' | 'agent';
  id: string | null;
  label: string;
}

export interface KnowledgeMessageWire {
  id: string;
  author: string;
  authorLabel: string;
  text: string;
  createdAt: string;
  clientMessageId: string | null;
}

interface KnowledgeEntryBaseWire {
  id: string;
  anchorKey: string;
  anchorLabel: string;
  frameId: string | null;
  frameName: string | null;
  flowId: string | null;
  subjectKey: string | null;
  /** Opaque DOM anchor plus a fractional point. Never surfaced by a tool. */
  spatial: {
    at: { x: number; y: number };
    element?: Record<string, unknown>;
  } | null;
  validity: KnowledgeValidityWire;
  freshness: 'current' | 'subject_changed' | 'unknown';
  author: KnowledgeAuthorWire;
  source: 'tag_mode' | 'hub' | 'mcp';
  updatedAt: string;
}

export interface KnowledgeThreadWire extends KnowledgeEntryBaseWire {
  kind: 'thread';
  anchorType: StoredAnchorType;
  status: ThreadStatus;
  createdAt: string;
  messageCount: number;
  messages?: KnowledgeMessageWire[];
  hasMoreMessages?: boolean;
}

export interface KnowledgeDescriptionWire extends KnowledgeEntryBaseWire {
  kind: 'description';
  anchorType: 'tag' | 'page';
  body: string;
}

export type KnowledgeEntryWire = KnowledgeThreadWire | KnowledgeDescriptionWire;

export interface ListKnowledgeWire {
  entries: KnowledgeEntryWire[];
  hasMoreEntries: boolean;
}

export interface PlanSizeWire {
  width: number;
  height: number;
}
export interface PlanRectWire {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FramePlacementWire {
  id: string;
  rect: PlanRectWire;
  selector?: string;
  anchor?: Record<string, unknown>;
}

export type FrameSourceWire =
  | { kind: 'page'; key: string; url: string }
  | { kind: 'figma'; fileKey: string; nodeId: string }
  | { kind: 'image' };

export interface FrameScreenshotWire {
  assetId: string;
  capturedAt: string;
  size: PlanSizeWire;
  dpr: number;
  capturedRect: PlanRectWire;
}

export interface FrameLeanWire {
  id: string;
  projectId: string;
  name: string;
  parentId: string | null;
  placements: FramePlacementWire[];
  size: PlanSizeWire;
  extends: string | null;
  source: FrameSourceWire | null;
  origin: 'drawn' | 'imported' | 'observed';
  flowId: string | null;
  screenshot: FrameScreenshotWire | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt: string | null;
}

export interface FrameWire extends FrameLeanWire {
  marks: Record<string, unknown>;
}

export interface FrameListWire {
  frames: FrameWire[];
}
export interface FrameLeanListWire {
  frames: FrameLeanWire[];
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
   * OPTIONAL: clients that cannot mint grants may omit it, and the
   * flow_manage handler guards on its presence before calling. Clients may
   * return their raw API response; the flow_manage handler whitelists the
   * fields it surfaces (never the ingest token or project id).
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

  /**
   * Observe session lifecycle. OPTIONAL as a trio: a client that cannot reach
   * the session endpoints omits all three, and the `observe_session` handler
   * guards on presence before calling. Reads stay with `listJourneys`, which
   * doubles as the flow-to-live-window resolver (`observe_sessions.flow_id` is
   * UNIQUE, so its `sessionId` IS the flow's live window).
   */
  startObserveSession?(
    options: StartObserveSessionOptions,
  ): Promise<ObserveSessionResult>;
  getObserveSession?(options: ObserveSessionRef): Promise<ObserveSessionResult>;
  endObserveSession?(options: ObserveSessionRef): Promise<void>;

  // Hub: the release spine, threads and knowledge (server-owned; the diff is
  // never computed client-side). REQUIRED, so both doors answer the same by
  // construction rather than by convention.
  listReleases(options: {
    projectId: string;
    flowId: string;
    limit?: number;
    offset?: number;
  }): Promise<ReleaseIndexWire>;
  getRelease(options: {
    projectId: string;
    flowId: string;
    ref: ReleaseRef;
  }): Promise<ReleaseDetailWire>;
  listStepHistory(options: {
    projectId: string;
    flowId: string;
    step: string;
    flow?: string;
    limit?: number;
  }): Promise<StepHistoryWire>;
  setReleaseRationale(options: {
    projectId: string;
    flowId: string;
    versionId: string;
    text: string;
  }): Promise<VersionAnnotationWire>;
  listThreads(options: {
    projectId: string;
    flowId: string;
    anchorType?: ThreadAnchorType;
    anchorKey?: string;
    status?: ThreadStatus;
    includeMessages: boolean;
    limit?: number;
  }): Promise<ListThreadsWire>;
  createThread(options: {
    projectId: string;
    flowId: string;
    anchorType: ThreadAnchorType;
    anchorKey: string;
    anchorLabel?: string;
    text: string;
  }): Promise<HubThreadWire>;
  addThreadMessage(options: {
    projectId: string;
    flowId: string;
    threadId: string;
    text: string;
  }): Promise<HubThreadWire>;
  listKnowledge(options: {
    projectId: string;
    pageKey?: string;
    frameId?: string;
    markId?: string;
    includeMessages: boolean;
    limit?: number;
  }): Promise<ListKnowledgeWire>;

  // Frames: read-only.
  listFrames(options: { projectId: string }): Promise<FrameLeanListWire>;
  listPageFrames(options: {
    projectId: string;
    pageKey: string;
  }): Promise<FrameListWire>;
  getFrame(options: { projectId: string; frameId: string }): Promise<FrameWire>;

  // Auth
  requestDeviceCode(): Promise<DeviceAuthorization>;
  /**
   * Finish an authorization already under way. Returns a status only: the
   * session it establishes is stored by the implementation, so a tool never
   * holds token material.
   */
  pollForToken(
    deviceCode: string,
    options?: { timeoutMs?: number },
  ): Promise<DeviceLoginResult>;
  whoami(): Promise<unknown>;
  /** Where a credential would come from, without resolving or refreshing it. */
  credentialSource(): 'env' | 'config' | null;
  /**
   * Retire the session. Where the credential was issued to this process, that
   * means revoking it with the server before dropping it locally; a plane
   * holding a bearer it did not issue reports nothing deleted.
   */
  logout(): Promise<{ deleted: boolean }>;

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
