import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { wrapUserData } from '../user-data.js';
import { links } from '../links.js';
import type {
  ToolClient,
  ReleaseRef,
  ReleaseDetailWire,
  StepHistoryWire,
  VersionAnnotationWire,
  HubThreadWire,
  KnowledgeEntryWire,
  ThreadAnchorType,
} from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  NO_DEFAULT_PROJECT_ERROR,
  resolveDefaultProject,
} from './project-context.js';
import { errorHint } from './feature-gate.js';

/**
 * `hub_manage`: the time-and-why dimension of a flow over MCP.
 *
 * The rest of the MCP surface answers what a flow IS right now. Nothing else
 * exposes the version spine, so this is the only door an agent has to the
 * release history and the reasoning attached to it. It registers on the SAME
 * server instance as `flow_manage`, `package_get`, and the rest, which is what
 * lets an agent compose the two: current config from those tools, history and
 * rationale from this one.
 *
 * Reads are progressive: `releases` is a lean index and never carries a
 * snapshot, `release_get` opens exactly one release in full. The diff in
 * `release_get` is computed by the server from the two stored snapshots, never
 * supplied by the caller, because capture is optional by design and an
 * unannotated release's diff is the only truth left to read.
 *
 * `knowledge` is the page dimension of the same story: what people wrote on the
 * frames of a page in Tag Mode. It is addressed by frame and mark rather than
 * by flow, because a note outlives the flow it was written against and one page
 * carries notes about several. `pageKey` narrows to a whole page, resolved to
 * its frames server-side. It reads only. Writing one happens where the mark is,
 * and settling one is a person's call, the same rule the threads actions
 * follow.
 *
 * Writes are additive only. `rationale_set` replaces the human note on one
 * release and `note_add` appends to a discussion; this tool has no delete
 * action of any kind, and no way to resolve a thread. Resolving states that a
 * release settled a question, which is a person's call to make in the app.
 */

// Caps and patterns the server enforces. Duplicated here so the schema can
// describe them; the app's src/lib/hub/threads.ts, src/lib/versions/step-history.ts,
// src/lib/hub/knowledge.ts and src/lib/api/schemas/frames.ts are the authority.
const MAX_ANNOTATION_TEXT_LENGTH = 4000;
const MAX_ANCHOR_KEY_LENGTH = 255;
const MAX_ANCHOR_LABEL_LENGTH = 255;
const MAX_STEP_HISTORY_LIMIT = 50;
const MAX_STEP_HISTORY_ENTRIES = 200;
const MAX_THREAD_LIMIT = 100;
const MAX_THREADS_WITH_MESSAGES = 20;
const MAX_SOURCE_KEY_LENGTH = 1024;
const MAX_MARK_ID_LENGTH = 200;
const FRAME_ID_PATTERN = /^frm_[A-Za-z0-9_-]{21}$/;
const THREAD_STATUSES = ['open', 'resolved'] as const;

const TITLE = 'Release History and Rationale';

/**
 * Exported so a host asserts parity against this exact string instead of
 * retyping it.
 */
export const HUB_MANAGE_DESCRIPTION =
  'Read a flow’s release history and the reasoning behind it: what each release changed, and why. ' +
  'Actions: releases (lean index of a flow’s releases, newest first, no snapshots), ' +
  'release_get (one release in full: its rationale plus a server-computed diff against the release before it), ' +
  'step_history (which releases added, changed, or removed one step), ' +
  'rationale_set (write the human rationale for one release; additive, nothing is ever deleted), ' +
  'threads (the discussion anchored to one release, or every open discussion on the flow), ' +
  'note_add (add a message to a thread, or open a new one on a release), ' +
  'knowledge (read what people wrote on the marks of a page in Tag Mode: one page, one mark, or the whole project). ' +
  'Threads are resolved by a person in the app, never here: this tool can only add to a discussion. ' +
  'Knowledge is read-only here for the same reason, and is addressed by frame and mark rather than by flow. ' +
  'Steps are addressed as "type.name", the same form flow_simulate takes, for example "destination.ga4", ' +
  '"transformer.router", "source.browser", "store.session", or "contract.checkout" for a contract entry. ' +
  'This tool carries history only: use flow_manage for the current config and package_get for step schemas.';

const ACTIONS = [
  'releases',
  'release_get',
  'step_history',
  'rationale_set',
  'threads',
  'note_add',
  'knowledge',
] as const;

/**
 * The anchors a caller may name here: the stored vocabulary MINUS `page`.
 *
 * A `page` anchor hangs on a FRAME, and every action here that opens a thread
 * opens it on a flow. The flow's threads response is parsed on the way out, so
 * a single page-anchored flow thread written from here would make the read fail
 * its own parse from then on, permanently, for everyone. Fencing the write is
 * what keeps that row from ever existing. Notes on a frame are written where
 * the frame is, never here.
 *
 * `satisfies` is the fence: the list is proved to be values the response
 * schemas can carry, so a member that only the storage layer knows about
 * cannot be added here without the wire contract moving first.
 */
const TOOL_ANCHOR_TYPES = [
  'step',
  'entity_action',
  'release',
  'contract',
  'tag',
] as const satisfies readonly ThreadAnchorType[];

/**
 * One flat schema with an `action` enum and per-action optional fields, the
 * shape `flow_manage`, `project_manage`, and `secret_manage` already use.
 * Per-action requirements are enforced in the handler, so later actions add a
 * field and an enum member without reshaping what callers already send.
 *
 * Exported so the declarative registry holds the same object rather than a
 * second copy of it.
 */
export const HUB_MANAGE_INPUT_SCHEMA = {
  action: z
    .enum(ACTIONS, {
      error: () => `Unknown action. Use one of: ${ACTIONS.join(', ')}`,
    })
    .describe('Which part of the release history to read or write'),
  projectId: z
    .string()
    .optional()
    .describe(
      'Project ID. Optional: falls back to the default project when omitted.',
    ),
  flowId: z
    .string()
    .optional()
    .describe(
      'Flow ID (flow_...). Required for every action except "knowledge", which hangs on a page rather than a flow and refuses this field.',
    ),
  versionId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Release version ID (ver_...) from action "releases". Addresses one release for release_get and rationale_set. Pass this or versionNumber.',
    ),
  versionNumber: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Spine release number for this flow, the `versionNumber` field of action "releases". Alternative to versionId. Not the same as a row\'s deploymentAttempt.',
    ),
  step: z
    .string()
    .optional()
    .describe(
      'Step key as "type.name", e.g. "destination.ga4" or "contract.checkout". Required for step_history.',
    ),
  flow: z
    .string()
    .optional()
    .describe(
      'Named flow inside the config, e.g. "web" or "server". Optional for step_history: omit to scan every named flow. Ignored for contract steps, which are top-level.',
    ),
  text: z
    .string()
    // Trimmed BEFORE the checks. Whitespace-only text otherwise satisfies
    // min(1) and then normalizes to empty downstream, which stores a blank
    // message, and on `rationale_set` reaches the annotation writer where
    // empty means CLEAR: the delete this additive-only tool does not have.
    .trim()
    .min(1)
    .max(MAX_ANNOTATION_TEXT_LENGTH)
    .optional()
    .describe(
      `The text to write (1-${MAX_ANNOTATION_TEXT_LENGTH} chars). Required for rationale_set and note_add. As rationale it replaces the note already on the release and never touches the machine summary; as a note it is appended to a thread and nothing is ever replaced.`,
    ),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      `Page size. Releases to list for action "releases" (max 100), or releases to SCAN for step_history (max ${MAX_STEP_HISTORY_LIMIT}). For step_history this bounds releases, not entries: a step present in several named flows yields one entry per flow per release, and the scan stops at ${MAX_STEP_HISTORY_ENTRIES} entries with entriesTruncated set. Narrow with "flow" to avoid that. For threads it bounds threads, and a read that carries messages is held to ${MAX_THREADS_WITH_MESSAGES} of them. Knowledge entries are bounded the same way.`,
    ),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Releases to skip. Action "releases" only.'),
  anchorType: z
    .enum(TOOL_ANCHOR_TYPES)
    .optional()
    .describe(
      'What a thread hangs on. Defaults to "release", the only anchor the app writes today. Pair it with anchorKey; a key means a different thing under each type.',
    ),
  anchorKey: z
    .string()
    .min(1)
    .max(MAX_ANCHOR_KEY_LENGTH)
    .optional()
    .describe(
      'What the anchor addresses within its type: a release version ID (ver_...) for "release", a "type.name" step key for "step". For a release you can pass versionId or versionNumber instead. Omit entirely on action "threads" to read every thread on the flow.',
    ),
  anchorLabel: z
    .string()
    .min(1)
    .max(MAX_ANCHOR_LABEL_LENGTH)
    .optional()
    .describe(
      'How the anchor reads on screen, stored once when a thread is opened so a later rename leaves it readable. Derived for a release ("v14"); pass it only when opening a thread on another anchor type.',
    ),
  threadId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Thread ID (thr_...) from action "threads". Pass it to note_add to reply in that thread; omit it to open a new thread on the anchor.',
    ),
  status: z
    .enum(THREAD_STATUSES)
    .optional()
    .describe(
      'Read only threads in this state. Action "threads" only; omit for both.',
    ),
  pageKey: z
    .string()
    .min(1)
    .max(MAX_SOURCE_KEY_LENGTH)
    .optional()
    .describe(
      'The page a note was left on, as Tag Mode addressed it, usually the page URL. Narrows action "knowledge" to every frame that page holds, at any depth; omit it to read the whole project.',
    ),
  frameId: z
    .string()
    .regex(FRAME_ID_PATTERN)
    .optional()
    .describe(
      'One frame (frm_...), the named rectangle a note hangs on. Action "knowledge" only. Narrower than pageKey, since a page holds several frames.',
    ),
  markId: z
    .string()
    .min(1)
    .max(MAX_MARK_ID_LENGTH)
    .optional()
    .describe(
      'One mark within "frameId". Action "knowledge" only, and refused without frameId, since a mark id alone addresses nothing. Naming a mark is also what attaches the message bodies.',
    ),
};

const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  // False because of `note_add`, which APPENDS. `rationale_set` is an upsert
  // and repeating it is harmless, but this block covers the whole tool, and a
  // client that retries a timed-out call on the strength of an idempotent hint
  // would post the same remark twice into a human discussion. Nothing here is
  // destructive either way: a duplicate message can be read past, and there is
  // no delete to undo it with.
  idempotentHint: false,
  openWorldHint: true,
} as const;

/**
 * Hints carry the verb ladder rather than the description. One constant per
 * sentence the tool can emit, so the surface fixture pins wording and ordering
 * by name and a reword fails a test instead of drifting.
 */
export const HUB_HINT_RELEASE_GET =
  'Use action "release_get" with a versionId or versionNumber to read one release in full, with its diff.';
export const HUB_HINT_ROWS_ARE_DEPLOYMENTS =
  'Rows are deployments, not releases: the same versionId on several rows is a redeploy of identical content, so count distinct versionId values, and note that total counts deployments.';
export const HUB_HINT_STEP_HISTORY =
  'Use action "step_history" to see which releases touched one step.';
export const HUB_HINT_MASKED_ONLY =
  'The diff is empty because the only changes are inside masked values. Say that the change is not visible here rather than that nothing changed.';
export const HUB_HINT_TRACE_STEP =
  'Use action "step_history" to trace one step across releases.';
export const HUB_HINT_WRITE_RATIONALE =
  'This release has no human rationale. Read the diff, then use action "rationale_set" to record why it changed.';
export const HUB_HINT_SCAN_CAPPED =
  'The scan stopped at the entry cap, so older releases were not compared. Narrow with "flow" to see the whole history of one occurrence.';
export const HUB_HINT_NO_MATCH =
  'No scanned release touched this step. Check the step key against knownSteps, or raise limit to scan further back.';
export const HUB_HINT_OPEN_RELEASE =
  'Use action "release_get" on one of these versionIds to read the full diff and rationale.';
export const HUB_HINT_RATIONALE_VISIBLE =
  'The rationale is now visible on this release in the app.';
export const HUB_HINT_CONFIRM_INDEX =
  'Use action "releases" to confirm it appears in the index.';
export const HUB_HINT_THREADS_PAGE_CAPPED = `More threads match than were returned (the page is capped at ${MAX_THREADS_WITH_MESSAGES} when messages are attached). Narrow with anchorType and anchorKey, or with status, rather than treating this as the complete list.`;
export const HUB_HINT_NOTHING_DISCUSSED =
  'Nothing is being discussed on this flow. Use action "note_add" with a versionId to start a thread on a release.';
export const HUB_HINT_NO_THREAD_ON_ANCHOR =
  'No thread hangs on this anchor yet. Use action "note_add" to open one.';
export const HUB_HINT_THREADS_INDEX =
  'This is an index: message bodies are omitted. Pass a versionId, or anchorType with anchorKey, to read one discussion in full.';
export const HUB_HINT_MESSAGES_TRUNCATED =
  'A thread here is marked hasMoreMessages: only its newest messages were returned. Say the discussion is longer than what you read rather than summarizing it as complete.';
export const HUB_HINT_REPLY_OR_OPEN =
  'Use action "note_add" with a threadId to reply in one of these threads, or without one to open another.';
export const HUB_HINT_RESOLVE_IN_APP =
  'Resolving a thread into a release is done by a person in the app, not through this tool.';
export const HUB_HINT_MESSAGE_VISIBLE =
  'The message is now visible in this thread in the app.';
export const HUB_HINT_STAYS_RESOLVED =
  'This thread is resolved and stayed resolved: a reply never retracts the release link.';
export const HUB_HINT_READ_BACK =
  'Use action "threads" to read the discussion back.';
export const HUB_HINT_THREAD_OPEN =
  'The thread is now open on this anchor in the app.';
export const HUB_HINT_KEEP_ONE_THREAD =
  'Pass its threadId back to action "note_add" to keep the conversation in one place instead of opening another thread.';
export const HUB_HINT_KNOWLEDGE_PAGE_CAPPED =
  'More knowledge matches than was returned. Narrow with pageKey, then frameId, then markId, rather than treating this as everything that was written.';
export const HUB_HINT_NOTHING_WRITTEN =
  'Nothing has been written here. Notes are left on the page in Tag Mode, not through this tool.';
export const HUB_HINT_KNOWLEDGE_INDEX =
  'This is an index: message bodies are omitted. Pass markId with frameId to read one mark in full.';
export const HUB_HINT_ENTRY_NAMES_FLOW =
  'An entry names the flow it was written against in flowId, and validity says which release was live at the time.';
export const HUB_HINT_KNOWLEDGE_READ_ONLY =
  'This tool only reads knowledge. Answering a note, and settling it, are done by a person in the app.';
export const HUB_HINT_READ_FRAME =
  'Use frame_manage action "get" with the frameId to read the frame and its marks.';
export const HUB_NOT_FOUND_HINT =
  'Use action "releases" to find version ids and action "threads" to find thread ids.';

/**
 * The same shape the transport validates against, applied again here.
 *
 * The MCP SDK does parse arguments before invoking a tool callback, but that
 * parse happens in whichever SDK copy the host linked, and this module's spec
 * is deliberately drivable without a transport at all. Parsing here is what
 * keeps the 4000-char cap and the additive-only guarantee inside this file:
 * `text: null` would otherwise reach the annotation writer, where null means
 * CLEAR, and quietly become the delete action this tool does not have.
 */
const hubInputSchema = z.object(HUB_MANAGE_INPUT_SCHEMA);

type HubInput = z.infer<typeof hubInputSchema>;

/**
 * Why a call was refused. Carried as `code` so an agent can branch on the
 * denial it is most likely to hit instead of matching prose. A denial the
 * server raises, such as FEATURE_NOT_AVAILABLE, arrives with its own code and
 * never needs a member here.
 */
export type HubToolErrorCode = 'INVALID_INPUT' | 'NOT_FOUND';

export class HubToolError extends Error {
  constructor(
    public readonly code: HubToolErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HubToolError';
  }
}

function requireParam<T>(
  value: T | undefined,
  name: string,
  action: string,
): T {
  if (value === undefined) {
    throw new HubToolError(
      'INVALID_INPUT',
      `${name} is required for action "${action}"`,
    );
  }
  return value;
}

/**
 * Resolve the release address a caller gave. `versionId` wins when both are
 * present, so an explicit id is never silently reinterpreted as a number.
 */
function releaseRef(input: HubInput, action: string): ReleaseRef {
  if (input.versionId !== undefined) return { versionId: input.versionId };
  if (input.versionNumber !== undefined) {
    return { versionNumber: input.versionNumber };
  }
  throw new HubToolError(
    'INVALID_INPUT',
    `versionId or versionNumber is required for action "${action}". Use action "releases" to find one.`,
  );
}

/**
 * Stored annotation text is written by people and lands in third-party model
 * context, so it is wrapped as data. Ids, numbers, and timestamps stay literal:
 * the agent has to echo them back verbatim in the next call.
 */
function serializeAnnotation(annotation: VersionAnnotationWire) {
  return {
    versionId: annotation.versionId,
    humanText:
      annotation.humanText === null ? null : wrapUserData(annotation.humanText),
    generatedSummary:
      annotation.generatedSummary === null
        ? null
        : wrapUserData(annotation.generatedSummary),
    author: annotation.author,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt,
  };
}

/**
 * The scan result as an index. An entry's own rationale text is not surfaced
 * here: `release_get` is the detail read, and repeating every note across a
 * fifty-release scan would make this the opposite of an index.
 */
function serializeStepHistory(history: StepHistoryWire) {
  return {
    step: history.step,
    flow: history.flow,
    entries: history.entries.map((entry) => ({
      versionId: entry.versionId,
      versionNumber: entry.versionNumber,
      createdAt: entry.createdAt,
      flow: entry.flow,
      change: entry.change,
    })),
    scanned: history.scanned,
    truncated: history.truncated,
    entriesTruncated: history.entriesTruncated,
    // Step keys and flow names are addresses the caller passes straight back,
    // so they stay literal for the same reason ids do.
    ...(history.knownSteps !== undefined && { knownSteps: history.knownSteps }),
  };
}

/**
 * Thread text is written by people and lands in third-party model context, so
 * message bodies and the anchor label are wrapped as data. Ids, the status, and
 * timestamps stay literal: the agent echoes them back in the next call.
 */
function serializeThread(thread: HubThreadWire) {
  return {
    threadId: thread.id,
    anchorType: thread.anchorType,
    anchorKey: thread.anchorKey,
    anchorLabel: wrapUserData(thread.anchorLabel),
    status: thread.status,
    // The release that settled it, null while open AND once that release is
    // gone. `status` is what separates those two, never this field.
    resolvedByVersionId: thread.resolvedByVersionId,
    resolvedByVersionNumber: thread.resolvedByVersionNumber,
    resolvedBy: thread.resolvedBy,
    createdBy: thread.createdBy,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    messageCount: thread.messageCount,
    ...(thread.messages !== undefined
      ? {
          // Set when the thread holds more than this call carried. The tail is
          // the OLD end: what is here is always the newest exchange.
          hasMoreMessages: thread.hasMoreMessages === true,
          messages: thread.messages.map((message) => ({
            author: message.author,
            text: wrapUserData(message.text),
            createdAt: message.createdAt,
          })),
        }
      : {}),
  };
}

/**
 * Knowledge is written on a live page and lands in third-party model context,
 * so the description body, the message bodies, the anchor's label, the frame's
 * name and the author's display name are wrapped as data. Ids, keys, the
 * derived validity and freshness, and timestamps stay literal: the agent
 * addresses the next call with the first and branches on the rest.
 *
 * The spatial placement is dropped rather than serialized. Its `element` is an
 * opaque DOM anchor captured from the page, of unbounded size and shape, and
 * the fractional point beside it only means something to something that draws
 * the overlay. Neither tells a reader here anything, and the first is page
 * content this tool would then have to wrap.
 */
function serializeKnowledge(entry: KnowledgeEntryWire) {
  const shared = {
    id: entry.id,
    anchorType: entry.anchorType,
    anchorKey: entry.anchorKey,
    anchorLabel: wrapUserData(entry.anchorLabel),
    frameId: entry.frameId,
    /** A person names a frame, so the name is page content like any other. */
    frameName: entry.frameName === null ? null : wrapUserData(entry.frameName),
    /** The flow it was written against, or null. Never a filter. */
    flowId: entry.flowId,
    subjectKey: entry.subjectKey,
    /** When it was true, and whether it still is. Derived at read time. */
    validity: entry.validity,
    freshness: entry.freshness,
    author: {
      kind: entry.author.kind,
      id: entry.author.id,
      label: wrapUserData(entry.author.label),
    },
    source: entry.source,
    updatedAt: entry.updatedAt,
  };

  if (entry.kind === 'description') {
    return { ...shared, kind: entry.kind, body: wrapUserData(entry.body) };
  }

  return {
    ...shared,
    kind: entry.kind,
    status: entry.status,
    createdAt: entry.createdAt,
    messageCount: entry.messageCount,
    ...(entry.messages !== undefined
      ? {
          // Set when the thread holds more than this call carried, and only
          // meaningful beside the messages it describes.
          hasMoreMessages: entry.hasMoreMessages === true,
          messages: entry.messages.map((message) => ({
            author: message.author,
            text: wrapUserData(message.text),
            createdAt: message.createdAt,
          })),
        }
      : {}),
  };
}

async function handleReleases(
  client: ToolClient,
  projectId: string,
  flowId: string,
  input: HubInput,
) {
  const { releases, total } = await client.listReleases({
    projectId,
    flowId,
    ...(input.limit !== undefined && { limit: input.limit }),
    ...(input.offset !== undefined && { offset: input.offset }),
  });

  // The screen this index is of. Structured rather than only mentioned in a
  // hint, so an agent can hand it on as data instead of re-typing it out of
  // prose. Named `appUrl`, the one key every tool here emits a link under, so
  // it can never collide with a `url` that some response already uses for
  // something of its own.
  const appUrl = links.release({
    baseUrl: client.appBaseUrl(),
    projectId,
    flowId,
  });

  return mcpResult(
    {
      releases: releases.map((release) => ({
        // The spine address. `release_get` and `rationale_set` take this pair
        // and nothing else.
        versionId: release.flowVersionId,
        versionNumber: release.flowVersionNumber,
        deployment: release.deploymentSlug,
        deploymentType: release.deploymentType,
        // The publish attempt within that deployment lineage. Deliberately NOT
        // called a version: it addresses nothing in this tool, and a row
        // carrying two numbers both named "version" is a trap.
        deploymentAttempt: release.versionNumber,
        status: release.status,
        source: release.source,
        errorCode: release.errorCode,
        createdAt: release.createdAt,
        createdBy: release.createdBy,
        rationale: release.rationale
          ? {
              hasHumanText: release.rationale.hasHumanText,
              hasGeneratedSummary: release.rationale.hasGeneratedSummary,
              firstLine:
                release.rationale.firstLine === null
                  ? null
                  : wrapUserData(release.rationale.firstLine),
            }
          : null,
      })),
      total,
      ...(appUrl !== undefined && { appUrl }),
    },
    {
      next: [
        HUB_HINT_RELEASE_GET,
        HUB_HINT_ROWS_ARE_DEPLOYMENTS,
        HUB_HINT_STEP_HISTORY,
      ],
    },
  );
}

async function handleReleaseGet(
  client: ToolClient,
  projectId: string,
  flowId: string,
  input: HubInput,
) {
  const release = await client.getRelease({
    projectId,
    flowId,
    ref: releaseRef(input, 'release_get'),
  });

  // The rendered diff is built from MASKED content, so an empty diff does not
  // mean the releases are the same: a change confined to an inline secret
  // renders as nothing. `contentIdentical` is decided over unmasked content,
  // so it is the only trustworthy identity signal, and the gap between the two
  // is stated rather than left for the reader to infer.
  const contentIdentical =
    release.diff !== null && release.diff.contentIdentical;
  const maskedOnly =
    release.diff !== null && release.diff.text === '' && !contentIdentical;

  return mcpResult(
    {
      versionId: release.versionId,
      versionNumber: release.versionNumber,
      contentHash: release.contentHash,
      createdAt: release.createdAt,
      createdBy: release.createdBy,
      rationale: release.rationale
        ? serializeAnnotation(release.rationale)
        : null,
      diff: release.diff
        ? {
            prevVersionId: release.diff.prevVersionId,
            prevVersionNumber: release.diff.prevVersionNumber,
            // Config values are user-authored, and inline secrets are masked
            // before the text is built.
            text:
              release.diff.text === '' ? null : wrapUserData(release.diff.text),
            /** Compared over unmasked content, so this is the real answer. */
            contentIdentical,
            note: maskedOnly
              ? 'These releases differ, but only inside values that are masked in the diff, typically inline secrets. Do not report this release as unchanged.'
              : null,
          }
        : null,
      diffUnavailable: release.diff
        ? null
        : 'This is the flow’s oldest release, so there is nothing to diff it against.',
    },
    {
      next: maskedOnly
        ? [HUB_HINT_MASKED_ONLY]
        : release.rationale?.humanText
          ? [HUB_HINT_TRACE_STEP]
          : [HUB_HINT_WRITE_RATIONALE],
    },
  );
}

async function handleStepHistory(
  client: ToolClient,
  projectId: string,
  flowId: string,
  input: HubInput,
) {
  const step = requireParam(input.step, 'step', 'step_history');

  const history = await client.listStepHistory({
    projectId,
    flowId,
    step,
    ...(input.flow !== undefined && { flow: input.flow }),
    ...(input.limit !== undefined && { limit: input.limit }),
  });

  const next = history.entriesTruncated
    ? [HUB_HINT_SCAN_CAPPED]
    : history.entries.length === 0
      ? [HUB_HINT_NO_MATCH]
      : [HUB_HINT_OPEN_RELEASE];

  // The step on screen, linked only when the scan itself says the step is
  // still there.
  //
  // `history.flow` is the caller's own filter echoed back, unvalidated, so a
  // scan that named no flow gets no link (a step address without one resolves
  // to nothing in the app) and a scan that named a wrong one would otherwise
  // build an address the flow page opens and then refuses. Entries come back
  // newest first, so an empty scan found the step in no release at all, and a
  // newest entry of `removed` means the last thing that happened to it was its
  // removal. Both are exactly the cases the app answers with its "not found in
  // this flow" notice, and no link beats a link to a notice.
  //
  // The flow names on the ENTRIES are deliberately not used as the address
  // instead: they say where the step USED to live. What remains is a step
  // renamed since the newest release, which no signal in hand can catch; the
  // app names that on screen.
  const newest = history.entries[0];
  const stepIsLive = newest !== undefined && newest.change !== 'removed';
  const appUrl = stepIsLive
    ? links.step({
        baseUrl: client.appBaseUrl(),
        projectId,
        flowId,
        step: history.step,
        flow: history.flow,
      })
    : undefined;

  return mcpResult(
    {
      ...serializeStepHistory(history),
      ...(appUrl !== undefined && { appUrl }),
    },
    { next },
  );
}

/**
 * Every release address goes through the detail read, by id as much as by
 * number: it is the one call that proves the release belongs to THIS flow and
 * hands back the number the app shows. A sibling flow's id therefore meets
 * NOT_FOUND from the client before anything is written.
 */
async function resolveRelease(
  client: ToolClient,
  projectId: string,
  flowId: string,
  input: HubInput,
  action: string,
): Promise<ReleaseDetailWire> {
  return client.getRelease({
    projectId,
    flowId,
    ref: releaseRef(input, action),
  });
}

async function handleRationaleSet(
  client: ToolClient,
  projectId: string,
  flowId: string,
  input: HubInput,
) {
  const text = requireParam(input.text, 'text', 'rationale_set');
  const release = await resolveRelease(
    client,
    projectId,
    flowId,
    input,
    'rationale_set',
  );

  const annotation = await client.setReleaseRationale({
    projectId,
    flowId,
    versionId: release.versionId,
    text,
  });

  return mcpResult(
    {
      versionId: annotation.versionId,
      versionNumber: release.versionNumber,
      rationale: serializeAnnotation(annotation),
    },
    { next: [HUB_HINT_RATIONALE_VISIBLE, HUB_HINT_CONFIRM_INDEX] },
  );
}

/** One anchor a thread hangs on, resolved from whatever the caller addressed. */
interface ResolvedAnchor {
  anchorType: ThreadAnchorType;
  anchorKey: string;
  anchorLabel: string;
}

/**
 * The anchor the caller addressed, or null when they addressed none.
 *
 * A release can be addressed the way every other action here takes one
 * (`versionId` / `versionNumber`), which is resolved through the flow so a
 * sibling flow's release is refused and the display label is derived from the
 * real release number rather than trusted from the caller. Any other anchor
 * type is taken as given: this tool cannot verify a step key against a config
 * it does not load, and a thread on a key that no longer exists is exactly what
 * `anchorLabel` and the unanchored bucket are for.
 */
async function resolveAnchor(
  client: ToolClient,
  projectId: string,
  flowId: string,
  input: HubInput,
  action: string,
): Promise<ResolvedAnchor | null> {
  const type = input.anchorType ?? 'release';

  if (type === 'release') {
    if (input.versionId === undefined && input.versionNumber === undefined) {
      if (input.anchorKey === undefined) return null;
      // An explicit key for a release anchor still has to be a release of this
      // flow, or the thread would point at nothing readable.
      const byKey = await client.getRelease({
        projectId,
        flowId,
        ref: { versionId: input.anchorKey },
      });
      return {
        anchorType: 'release',
        anchorKey: byKey.versionId,
        anchorLabel: `v${byKey.versionNumber}`,
      };
    }

    const release = await resolveRelease(
      client,
      projectId,
      flowId,
      input,
      action,
    );
    return {
      anchorType: 'release',
      anchorKey: release.versionId,
      anchorLabel: `v${release.versionNumber}`,
    };
  }

  if (input.anchorKey === undefined) return null;
  return {
    anchorType: type,
    anchorKey: input.anchorKey,
    anchorLabel: input.anchorLabel ?? input.anchorKey,
  };
}

async function handleThreads(
  client: ToolClient,
  projectId: string,
  flowId: string,
  input: HubInput,
) {
  const anchor = await resolveAnchor(
    client,
    projectId,
    flowId,
    input,
    'threads',
  );

  // Message bodies come back only for ONE anchor. A whole-flow listing is an
  // index, and carrying every word ever written on every anchor would make it
  // the opposite of one.
  const { threads, hasMoreThreads } = await client.listThreads({
    projectId,
    flowId,
    includeMessages: anchor !== null,
    ...(anchor !== null
      ? { anchorType: anchor.anchorType, anchorKey: anchor.anchorKey }
      : {}),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.limit !== undefined && {
      limit: Math.min(input.limit, MAX_THREAD_LIMIT),
    }),
  });

  const truncated = threads.some((thread) => thread.hasMoreMessages === true);

  // The page ceiling is not what the caller asked for: a read that carries
  // message bodies is clamped hard. Saying so keeps an agent from reporting a
  // truncated page as the whole of a flow's discussion.
  const pageHint = hasMoreThreads ? [HUB_HINT_THREADS_PAGE_CAPPED] : [];

  const next =
    threads.length === 0
      ? [
          anchor === null
            ? HUB_HINT_NOTHING_DISCUSSED
            : HUB_HINT_NO_THREAD_ON_ANCHOR,
        ]
      : anchor === null
        ? [...pageHint, HUB_HINT_THREADS_INDEX]
        : [
            ...pageHint,
            ...(truncated ? [HUB_HINT_MESSAGES_TRUNCATED] : []),
            HUB_HINT_REPLY_OR_OPEN,
            HUB_HINT_RESOLVE_IN_APP,
          ];

  // Where these are read. An anchored read links the anchor's own screen, and
  // only a release anchor can be addressed from the shape held here. An
  // unanchored read is the flow's whole discussion, which is read in the
  // release history, so it links that.
  const flowTarget = { baseUrl: client.appBaseUrl(), projectId, flowId };
  const appUrl =
    anchor === null
      ? links.release(flowTarget)
      : links.thread({ ...flowTarget, anchorType: anchor.anchorType });

  return mcpResult(
    {
      threads: threads.map(serializeThread),
      hasMoreThreads,
      ...(appUrl !== undefined && { appUrl }),
    },
    { next },
  );
}

async function handleNoteAdd(
  client: ToolClient,
  projectId: string,
  flowId: string,
  input: HubInput,
) {
  const text = requireParam(input.text, 'text', 'note_add');

  if (input.threadId !== undefined) {
    const thread = await client.addThreadMessage({
      projectId,
      flowId,
      threadId: input.threadId,
      text,
    });
    return mcpResult(
      { thread: serializeThread(thread) },
      {
        next: [
          HUB_HINT_MESSAGE_VISIBLE,
          thread.status === 'resolved'
            ? HUB_HINT_STAYS_RESOLVED
            : HUB_HINT_READ_BACK,
        ],
      },
    );
  }

  const anchor = await resolveAnchor(
    client,
    projectId,
    flowId,
    input,
    'note_add',
  );
  if (anchor === null) {
    throw new HubToolError(
      'INVALID_INPUT',
      'note_add needs somewhere to write: pass threadId to reply, or versionId (or anchorType with anchorKey) to open a thread on an anchor.',
    );
  }

  const thread = await client.createThread({
    projectId,
    flowId,
    anchorType: anchor.anchorType,
    anchorKey: anchor.anchorKey,
    // A release anchor is labeled by the server from the release number, so the
    // label travels only for the other anchor types.
    ...(anchor.anchorType !== 'release' && { anchorLabel: anchor.anchorLabel }),
    text,
  });

  return mcpResult(
    { thread: serializeThread(thread) },
    { next: [HUB_HINT_THREAD_OPEN, HUB_HINT_KEEP_ONE_THREAD] },
  );
}

async function handleKnowledge(
  client: ToolClient,
  projectId: string,
  input: HubInput,
) {
  // Message bodies come back only for ONE mark, the rule `threads` follows for
  // one anchor: a page-wide or project-wide read is an index, and carrying
  // every word written on every mark would make it the opposite of one.
  const oneMark = input.markId !== undefined;

  // The server refuses a mark without its page rather than answering an
  // unnarrowed list, and that refusal carries its own code through mcpError.
  const { entries, hasMoreEntries } = await client.listKnowledge({
    projectId,
    includeMessages: oneMark,
    ...(input.pageKey !== undefined && { pageKey: input.pageKey }),
    ...(input.frameId !== undefined && { frameId: input.frameId }),
    ...(input.markId !== undefined && { markId: input.markId }),
    ...(input.limit !== undefined && { limit: input.limit }),
  });

  const truncated = entries.some(
    (entry) => entry.kind === 'thread' && entry.hasMoreMessages === true,
  );

  const pageHint = hasMoreEntries ? [HUB_HINT_KNOWLEDGE_PAGE_CAPPED] : [];

  const next =
    entries.length === 0
      ? [HUB_HINT_NOTHING_WRITTEN]
      : [
          ...pageHint,
          ...(oneMark
            ? truncated
              ? [HUB_HINT_MESSAGES_TRUNCATED]
              : []
            : [HUB_HINT_KNOWLEDGE_INDEX]),
          HUB_HINT_ENTRY_NAMES_FLOW,
          HUB_HINT_KNOWLEDGE_READ_ONLY,
          HUB_HINT_READ_FRAME,
        ];

  return mcpResult(
    { entries: entries.map(serializeKnowledge), hasMoreEntries },
    { next },
  );
}

export async function hubManageHandler(client: ToolClient, rawInput: unknown) {
  try {
    // Parse, never assert: see the note on `hubInputSchema`. A raw ZodError
    // stringifies its whole issue list into `message`, so the issues are
    // rewritten as one readable line carrying the same code as every other
    // refusal here.
    const parsed = hubInputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) {
      throw new HubToolError(
        'INVALID_INPUT',
        parsed.error.issues
          .map(
            (issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`,
          )
          .join('; '),
      );
    }
    const input: HubInput = parsed.data;
    const { action } = input;

    const projectId = resolveDefaultProject(client, input.projectId);
    if (!projectId) {
      throw new HubToolError('INVALID_INPUT', NO_DEFAULT_PROJECT_ERROR);
    }

    if (action === 'knowledge') {
      // Nothing here narrows knowledge by flow. Taking the field and answering
      // with every page's notes anyway is the failure mode this refuses: the
      // caller asked for one flow's and would read the answer as that.
      if (input.flowId !== undefined) {
        throw new HubToolError(
          'INVALID_INPUT',
          'flowId does not narrow action "knowledge", which is addressed by frame and mark: pass pageKey, frameId or markId instead. Each entry names the flow it was written against.',
        );
      }
      return await handleKnowledge(client, projectId, input);
    }

    const flowId = requireParam(input.flowId, 'flowId', action);

    switch (action) {
      case 'releases':
        return await handleReleases(client, projectId, flowId, input);
      case 'release_get':
        return await handleReleaseGet(client, projectId, flowId, input);
      case 'step_history':
        return await handleStepHistory(client, projectId, flowId, input);
      case 'rationale_set':
        return await handleRationaleSet(client, projectId, flowId, input);
      case 'threads':
        return await handleThreads(client, projectId, flowId, input);
      case 'note_add':
        return await handleNoteAdd(client, projectId, flowId, input);
    }
  } catch (error) {
    // `mcpError` lifts a `code` property off the error, so a HubToolError and
    // whatever the client raises both surface their code without a branch here.
    return mcpError(error, errorHint(error, 'hub', HUB_NOT_FOUND_HINT));
  }
}

/**
 * The tool as data, so it can be driven without an MCP transport (tests, and
 * any in-process bridge).
 */
export function createHubManageToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'hub_manage',
    title: TITLE,
    description: HUB_MANAGE_DESCRIPTION,
    inputSchema: HUB_MANAGE_INPUT_SCHEMA,
    annotations,
    handler: (input) => hubManageHandler(client, input),
  };
}

export function registerHubManageTool(server: McpServer, client: ToolClient) {
  const spec = createHubManageToolSpec(client);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      annotations: spec.annotations,
    },
    (args) => hubManageHandler(client, args),
  );
}
