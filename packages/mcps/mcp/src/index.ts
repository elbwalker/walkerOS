import type { ToolClient } from './tool-client.js';
import type { ToolSpec } from './tool-spec.js';

declare module '@walkeros/core' {
  interface SourceMap {
    mcp: { type: 'mcp'; platform: 'server'; tool?: string };
  }
}

import { createAuthToolSpec } from './tools/auth.js';
import { createProjectManageToolSpec } from './tools/project-manage.js';
import { createFlowManageToolSpec } from './tools/flow-manage.js';
import { createDeployManageToolSpec } from './tools/deploy-manage.js';
import { createSecretManageToolSpec } from './tools/secret-manage.js';
import { createObserveJourneysToolSpec } from './tools/observe-journeys.js';
import { createObserveSessionToolSpec } from './tools/observe-session.js';
import { createHubManageToolSpec } from './tools/hub-manage.js';
import { createFrameManageToolSpec } from './tools/frame-manage.js';
import { createFeedbackToolSpec } from './tools/feedback.js';

import { createFlowValidateToolSpec } from './tools/validate.js';
import { createFlowBundleToolSpec } from './tools/bundle.js';
import { createFlowSimulateToolSpec } from './tools/simulate.js';
import { createFlowPushToolSpec } from './tools/push.js';
import { createFlowExamplesToolSpec } from './tools/examples.js';
import { createFlowLoadToolSpec } from './tools/flow-load.js';
import {
  createPackageSearchToolSpec,
  createPackageGetToolSpec,
} from './tools/package.js';
import { createDiagnosticsToolSpec } from './tools/diagnostics.js';

export {
  createWalkerOSMcpServer,
  type CreateServerOptions,
  type Logger,
} from './server.js';
export type {
  ToolClient,
  JourneysResult,
  ReleaseRef,
  ReleaseIndexWire,
  ReleaseDetailWire,
  StepHistoryWire,
  VersionAnnotationWire,
  HubThreadWire,
  ListThreadsWire,
  KnowledgeEntryWire,
  ListKnowledgeWire,
  FrameWire,
  FrameLeanWire,
  FrameListWire,
  FrameLeanListWire,
} from './tool-client.js';
export { HttpToolClient } from './http-tool-client.js';
export {
  createStreamableHttpHandler,
  type CreateStreamableHttpHandlerOptions,
} from './http.js';
export {
  TOOL_DEFINITIONS,
  type ToolDefinition,
  type ToolAnnotations,
} from './tool-definitions.js';

export type { ToolSpec } from './tool-spec.js';

/**
 * The `observe_session` description and next-hints, so a host embedding this
 * tool asserts parity against these strings rather than retyping them.
 */
export {
  DESCRIPTION as OBSERVE_SESSION_DESCRIPTION,
  HINT_SIMULATE_FIRST,
  HINT_PREVIEW_STREAMS,
  HINT_READ,
  HINT_STOP,
  HINT_EMPTY_FEED,
  HINT_ENDED,
  HINT_NO_WINDOW,
} from './tools/observe-session.js';

/**
 * The `hub_manage` description and next-hints, on the same rule as
 * `observe_session` above: a host asserts parity against these strings rather
 * than retyping them.
 */
export {
  HUB_MANAGE_DESCRIPTION,
  HUB_MANAGE_INPUT_SCHEMA,
  HUB_HINT_RELEASE_GET,
  HUB_HINT_ROWS_ARE_DEPLOYMENTS,
  HUB_HINT_STEP_HISTORY,
  HUB_HINT_MASKED_ONLY,
  HUB_HINT_TRACE_STEP,
  HUB_HINT_WRITE_RATIONALE,
  HUB_HINT_SCAN_CAPPED,
  HUB_HINT_NO_MATCH,
  HUB_HINT_OPEN_RELEASE,
  HUB_HINT_RATIONALE_VISIBLE,
  HUB_HINT_CONFIRM_INDEX,
  HUB_HINT_THREADS_PAGE_CAPPED,
  HUB_HINT_NOTHING_DISCUSSED,
  HUB_HINT_NO_THREAD_ON_ANCHOR,
  HUB_HINT_THREADS_INDEX,
  HUB_HINT_MESSAGES_TRUNCATED,
  HUB_HINT_REPLY_OR_OPEN,
  HUB_HINT_RESOLVE_IN_APP,
  HUB_HINT_MESSAGE_VISIBLE,
  HUB_HINT_STAYS_RESOLVED,
  HUB_HINT_READ_BACK,
  HUB_HINT_THREAD_OPEN,
  HUB_HINT_KEEP_ONE_THREAD,
  HUB_HINT_KNOWLEDGE_PAGE_CAPPED,
  HUB_HINT_NOTHING_WRITTEN,
  HUB_HINT_KNOWLEDGE_INDEX,
  HUB_HINT_ENTRY_NAMES_FLOW,
  HUB_HINT_KNOWLEDGE_READ_ONLY,
  HUB_HINT_READ_FRAME,
  HUB_NOT_FOUND_HINT,
} from './tools/hub-manage.js';

/**
 * The `frame_manage` description, input schema and next-hints, on the same
 * rule as `hub_manage` above: a host asserts parity against these strings
 * rather than retyping them.
 */
export {
  FRAME_MANAGE_DESCRIPTION,
  FRAME_MANAGE_INPUT_SCHEMA,
  FRAME_HINT_OPEN_PAGE_OR_GET,
  FRAME_HINT_NAMES_ARE_DOCUMENTATION,
  FRAME_HINT_NONE_YET,
  FRAME_HINT_MARK_SPACE,
  FRAME_HINT_READ_KNOWLEDGE,
  FRAME_HINT_NONE_ON_PAGE,
  FRAME_HINT_EXTENDS_BASE,
  FRAME_NOT_FOUND_HINT,
} from './tools/frame-manage.js';

/**
 * The shared feature gate. A door refuses a gated tool with
 * `FEATURE_NOT_AVAILABLE`, and every gated tool turns that into the same hint.
 */
export {
  FEATURE_NOT_AVAILABLE,
  isFeatureDenial,
  featureDenialHint,
  type GatedFeature,
} from './tools/feature-gate.js';

export {
  wrapUserData,
  redactNestedStrings,
  type RedactOptions,
} from './user-data.js';

export {
  flowCanvasResult,
  isFlowCanvasResult,
  type FlowCanvasToolResult,
  type FlowCanvasPayload,
  type SuggestionTile,
} from './ui-parts.js';

/**
 * Addresses of app screens. Published because the app depends on this package
 * and never the reverse, so this is the only place a link definition can live
 * that both the tools and an app-side caller can reach.
 */
export {
  links,
  type FlowLinkTarget,
  type StepLinkTarget,
  type ThreadLinkTarget,
  type DeploymentLinkTarget,
} from './links.js';

/**
 * Handler-bearing spec for every tool `createWalkerOSMcpServer` registers.
 *
 * Consumers that need to drive the tools WITHOUT an `McpServer` (e.g., the
 * walkerOS app's chat route wrapping them as Vercel AI SDK tools) should call
 * `createToolHandlers(client, packageVersion)` and iterate the returned record.
 * Handlers are closed over `client`, so the caller can bind a single
 * `ToolClient` (such as the zero-hop `ServiceToolClient`) once per session.
 * `packageVersion` is reported by the `diagnostics` tool and defaults to
 * `'0.0.0'` when omitted.
 */
export function createToolHandlers(
  client: ToolClient,
  packageVersion = '0.0.0',
): Record<string, ToolSpec> {
  const specs: ToolSpec[] = [
    createAuthToolSpec(client),
    createProjectManageToolSpec(client),
    createFlowManageToolSpec(client),
    createDeployManageToolSpec(client),
    createSecretManageToolSpec(client),
    createObserveSessionToolSpec(client),
    createObserveJourneysToolSpec(client),
    createHubManageToolSpec(client),
    createFrameManageToolSpec(client),
    createFeedbackToolSpec(client),
    createFlowValidateToolSpec(),
    createFlowBundleToolSpec(client),
    createFlowSimulateToolSpec(client),
    createFlowPushToolSpec(),
    createFlowExamplesToolSpec(),
    createFlowLoadToolSpec(client),
    createPackageSearchToolSpec(),
    createPackageGetToolSpec(),
    createDiagnosticsToolSpec(client, packageVersion),
  ];
  return Object.fromEntries(specs.map((s) => [s.name, s]));
}

export type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
