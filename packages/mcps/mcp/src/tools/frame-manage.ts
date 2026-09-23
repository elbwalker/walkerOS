import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpResult, mcpError } from '@walkeros/core';
import { redactNestedStrings, wrapUserData } from '../user-data.js';
import type { ToolClient, FrameLeanWire, FrameWire } from '../tool-client.js';
import type { ToolSpec } from '../tool-spec.js';
import {
  validateActionInput,
  assertParam,
  FRAME_MANAGE_REQUIREMENTS,
} from '../action-requirements.js';
import {
  NO_DEFAULT_PROJECT_ERROR,
  resolveDefaultProject,
} from './project-context.js';
import { errorHint } from './feature-gate.js';

/**
 * `frame_manage`: the place dimension of a measurement plan over MCP.
 *
 * A frame is a named rectangle over a page, with marks inside it. It answers
 * WHERE something is measured, which nothing else on this surface carries:
 * `flow_manage` holds the config, `hub_manage` holds the history and the
 * reasoning, and this holds the drawing those two are argued about on.
 *
 * Read-only, on purpose. A frame is drawn against a live page or an import,
 * and its geometry only means anything next to the pixels it was drawn on.
 * A tool that cannot see the page cannot place a rectangle on it, so writing
 * one from here would be guessing. Editing happens in Tag Mode or the app.
 *
 * Reads are progressive, the same ladder `hub_manage` uses. `list` is the lean
 * project index and never carries marks, because the marks of a whole project
 * are the largest thing this tool could return and are almost never what a
 * caller wanted. `page` opens one page's frames with their marks, and `get`
 * opens exactly one frame.
 *
 * It composes with `hub_manage` through ids: a tag id read here is the
 * `markId` that tool's "knowledge" action takes, which is why tag ids stay
 * literal while everything else inside the marks is wrapped as user data.
 */

// Caps and patterns the server enforces. Duplicated here so the schema can
// describe them; the app's src/lib/api/schemas/frames.ts is the authority.
const FRAME_ID_PATTERN = /^frm_[A-Za-z0-9_-]{21}$/;
const MAX_PAGE_KEY_CHARS = 1024;

const TITLE = 'Frames';

/**
 * Exported so a host asserts parity against this exact string instead of
 * retyping it.
 */
export const FRAME_MANAGE_DESCRIPTION =
  'Read the frames of a measurement plan: named rectangles with marks inside them, drawn in Tag Mode or in the app. ' +
  'Actions: list (every frame of the project, without marks), page (the frames of one page at any depth, with marks), get (one frame with its marks). ' +
  'Read-only: frames are drawn and edited in Tag Mode or the app, never here. ' +
  'A frame name is documentation; the marks inside it carry the meaning. A frame that extends another stores only what it adds, so its tags may carry only the fields they change. ' +
  'Marks are { tags, note }: tags is one flat list of tags, each with an id, a kind such as entity, property or action, a name, and a parentId naming the tag it sits under; note is the frame’s own description and thread. ' +
  'Use hub_manage action "knowledge" with a frameId or markId to read what people wrote on a frame. ' +
  'A markId is a tag id: a tag’s id, parentId and threadRef come back literal when they have the shape the app mints, so they can be passed straight back; every other string value in the marks is wrapped as data, and so is an object key that is not a plain identifier.';

/**
 * Exported so the declarative registry holds the same object rather than a
 * second copy of it.
 */
export const FRAME_MANAGE_INPUT_SCHEMA = {
  action: z
    .enum(['list', 'page', 'get'])
    .describe(
      'list the project’s frames, read one page with marks, or read one frame',
    ),
  projectId: z
    .string()
    .optional()
    .describe(
      'Project ID. Optional: falls back to the default project when omitted.',
    ),
  pageKey: z
    .string()
    .min(1)
    .max(MAX_PAGE_KEY_CHARS)
    .optional()
    .describe(
      'The page as its frames address it (the `source.key` of a page frame, usually the page URL without query). Required for page.',
    ),
  frameId: z
    .string()
    .regex(FRAME_ID_PATTERN)
    .optional()
    .describe(
      'Frame ID (frm_...). Required for get. Use action "list" or "page" to find one.',
    ),
};

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/**
 * Hints carry the verb ladder rather than the description. One constant per
 * sentence the tool can emit, so the surface fixture pins wording and ordering
 * by name and a reword fails a test instead of drifting.
 */
export const FRAME_HINT_OPEN_PAGE_OR_GET =
  'Use action "page" with a pageKey (a frame’s source.key) to read a page with marks, or action "get" with a frameId.';
export const FRAME_HINT_NAMES_ARE_DOCUMENTATION =
  'Frame names are documentation; the marks inside a frame carry the meaning.';
export const FRAME_HINT_NONE_YET =
  'This project has no frames yet. Frames are drawn in Tag Mode or the app, not through this tool.';
export const FRAME_HINT_MARK_SPACE =
  'Tag geometry is fractional: a rect is 0..1 of its frame, and an at is 0..1 of its parent tag’s box, or of the frame for a root tag; a child frame sits inside its parent through placements[].rect.';
export const FRAME_HINT_READ_KNOWLEDGE =
  'Use hub_manage action "knowledge" with frameId (and markId) to read what people wrote here. A markId is a tag id from these marks, and a tag’s threadRef is the id of its thread entry there.';
export const FRAME_HINT_NONE_ON_PAGE =
  'No frames on this page. Check the pageKey against the source.key values from action "list".';
export const FRAME_HINT_EXTENDS_BASE =
  'This frame extends another and stores only what it adds; read the base frame (extends) for the rest.';
export const FRAME_NOT_FOUND_HINT =
  'Use action "list" or "page" to find frame ids.';

/**
 * The two source keys that stay literal, and only those. `kind` is the
 * discriminator a reader branches on, and `key` is the pageKey the `page`
 * action takes, so it has to be echoed back verbatim. Every other string in a
 * source is text a reader only ever looks at: the page `url`, and the `fileKey`
 * and `nodeId` of an imported design. No action takes any of them, so they are
 * wrapped like any other value.
 */
const keepSourceAddress = (key: string): boolean =>
  key === 'kind' || key === 'key';

/**
 * A placement's `selector` and `anchor` are opaque DOM anchors captured off a
 * live page, of unbounded size: page content a reader gains nothing from and
 * this tool would otherwise have to wrap. Only the rectangle is kept.
 *
 * `projectId` and `deletedAt` are dropped for a different reason: the caller
 * named the project, and a listing only ever carries live frames, so both
 * would be noise on every row.
 */
function serializeLean(frame: FrameLeanWire) {
  return {
    id: frame.id,
    name: wrapUserData(frame.name),
    parentId: frame.parentId,
    extends: frame.extends,
    source: redactNestedStrings(frame.source, { skip: keepSourceAddress }),
    origin: frame.origin,
    flowId: frame.flowId,
    placements: frame.placements.map((placement) => ({
      id: placement.id,
      rect: placement.rect,
    })),
    size: frame.size,
    screenshot: frame.screenshot
      ? {
          assetId: frame.screenshot.assetId,
          capturedAt: frame.screenshot.capturedAt,
          size: frame.screenshot.size,
          dpr: frame.screenshot.dpr,
          capturedRect: frame.screenshot.capturedRect,
        }
      : null,
    version: frame.version,
    createdAt: frame.createdAt,
    updatedAt: frame.updatedAt,
    createdBy: frame.createdBy,
    updatedBy: frame.updatedBy,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The rule for everything inside a marks document, in one place.
 *
 *  - An ADDRESS stays literal, because another tool consumes it and it has to
 *    be passed back exactly as it came. A sanitised address names a tag the app
 *    never stored, so cleaning one trades a working lookup for a silent miss.
 *  - Everything else is text a person or a page wrote, and is always wrapped,
 *    so it cannot close the envelope and be read as instructions.
 *
 * Marks are a passthrough record: the server checks nothing inside them, so a
 * client writes whatever keys and values it likes, and a name that means
 * "identifier" in a flow config means nothing here. An address is therefore
 * decided by WHERE a value lives and by WHAT it looks like, never by the
 * spelling of its key alone.
 *
 * Where: a marks document is `{ tags, note }`. `tags` is one flat list of tags,
 * related through `parentId`, and `note` is the frame's own description and
 * thread. Only the top-level fields of a tag in that list, and of that note, can
 * be addresses. Below them nothing is, whatever it is called: `id` inside an
 * anchor is `el.id` read off the host page, and `id` on a thread message is a
 * row id no tool takes, so both are text like their siblings.
 *
 * What: a value in an address position stays literal only when it has the shape
 * the app mints for that address. Nothing upstream enforces the shape, so a
 * sentence stored under `id` is text and is wrapped like any other. A real
 * address that falls outside the shape comes back wrapped too, which costs a
 * lookup and never leaks an instruction.
 *
 * A key this file does not name, at any level, is walked as text. Object keys
 * are client-written too, so a key keeps its spelling only when it is a plain
 * identifier (see {@link markKey}); any other key is wrapped like a value.
 */

/**
 * A tag id as the app mints it, and nothing wider:
 *
 *  - `<prefix>_<n>` from the editor (`nextMarkId` in `tag-plan/frames.ts`,
 *    `freshId` in `tag-plan/write.ts`);
 *  - `e_<entity>`, `...#data.v<n>` and `...#action.<n>` from a contract or observed
 *    events (`tag-plan/contract.ts`, `tag-plan/infer.ts`);
 *  - `<entity>-<n>`, a nested `.../<entity>-<n>`, `...#data.<n>`, `...#action.<n>`,
 *    `...#context.<n>`, `globals#<n>` and `page#action.<n>` from a page read
 *    (`tag-plan/walker-plan.ts`).
 *
 * No colon, which keeps the hub key `<frameId>:<markId>` parseable, and no
 * whitespace, quote or angle bracket. An entity name outside `[A-Za-z0-9_-]`
 * makes the last two minters spell an id this does not match, which then wraps.
 */
const TAG_ID_PATTERN =
  /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*(?:#(?:data\.v?[0-9]+|action\.[0-9]+|context\.[0-9]+|[0-9]+))?$/;

/** The longest mark id the hub accepts (`MAX_MARK_ID_LENGTH` in the app's
 *  `src/lib/hub/knowledge.ts`), so a longer value cannot be a markId. */
const MAX_TAG_ID_CHARS = 200;

/** A hub thread id as the app mints it: `thr_` plus a 21-character lowercase
 *  alphanumeric nanoid (`src/lib/id.ts`, `src/lib/hub/knowledge.ts`). */
const THREAD_ID_PATTERN = /^thr_[a-z0-9]{21}$/;

const isTagId = (value: string): boolean =>
  value.length <= MAX_TAG_ID_CHARS && TAG_ID_PATTERN.test(value);

const isThreadId = (value: string): boolean => THREAD_ID_PATTERN.test(value);

/** The fields of a tag that are addresses, each with the shape it must have. */
const TAG_ADDRESSES: ReadonlyMap<string, (value: string) => boolean> = new Map([
  // The tag id: the markId `hub_manage` action "knowledge" takes, which the
  // app joins to the frame id as the anchor key `<frameId>:<markId>`.
  ['id', isTagId],
  // The tag this one sits under, which is that tag's id: the only relation
  // between tags, so a reader joins it to `id` to rebuild the tree, and it is
  // a markId in its own right.
  ['parentId', isTagId],
  // The hub thread this tag's note thread became: the `id` of the thread
  // entry `hub_manage` action "knowledge" returns for this tag.
  ['threadRef', isThreadId],
]);

/** The fields of the frame note that are addresses. The note belongs to the
 *  frame, which `hub_manage` addresses by frameId, so its one address is the hub
 *  thread it became, read the same way as a tag's. */
const NOTE_ADDRESSES: ReadonlyMap<string, (value: string) => boolean> = new Map(
  [['threadRef', isThreadId]],
);

/** A key the app writes: a JavaScript-style identifier, dashes allowed for
 *  attribute names, bounded in length. Such a key cannot close the envelope or
 *  carry a sentence, so it stays readable. */
const MARK_KEY_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$-]{0,63}$/;

/** A marks key as it is handed back: literal when it has the shape of a key the
 *  app writes, wrapped as data otherwise. */
const markKey = (key: string): string =>
  MARK_KEY_PATTERN.test(key) ? key : wrapUserData(key);

/** Text below the addresses: every string wrapped, every key through
 *  {@link markKey}. */
function walkText(value: unknown): unknown {
  if (typeof value === 'string') return wrapUserData(value);
  if (Array.isArray(value)) return value.map(walkText);
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[markKey(key)] = walkText(child);
  }
  return out;
}

/** Walks a marks document applying the rule above. */
function walkMarks(marks: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(marks)) {
    if (key === 'tags' && Array.isArray(value)) {
      out[key] = value.map((tag) => walkAddressed(tag, TAG_ADDRESSES));
    } else if (key === 'note') {
      out[key] = walkAddressed(value, NOTE_ADDRESSES);
    } else {
      out[markKey(key)] = walkText(value);
    }
  }
  return out;
}

/**
 * One record whose own fields named in `addresses` stay literal when their
 * value has that address's shape. A value there without the shape, a string or
 * not, is not an address, so it is walked like anything else rather than passed
 * through unseen, and so is everything below the record's own fields. A value
 * that is not a record has no fields to address and is text.
 */
function walkAddressed(
  value: unknown,
  addresses: ReadonlyMap<string, (value: string) => boolean>,
): unknown {
  if (!isRecord(value)) return walkText(value);
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    const isAddress = addresses.get(key);
    out[markKey(key)] =
      isAddress !== undefined && typeof field === 'string' && isAddress(field)
        ? field
        : walkText(field);
  }
  return out;
}

function serializeFrame(frame: FrameWire) {
  return {
    ...serializeLean(frame),
    marks: walkMarks(frame.marks),
  };
}

/**
 * The same shape the transport validates against, applied again here, on the
 * rule `hub_manage` states: this module's spec is deliberately drivable without
 * a transport, so the caps and the id pattern have to hold inside this file
 * rather than in whichever SDK copy a host linked.
 */
const frameInputSchema = z.object(FRAME_MANAGE_INPUT_SCHEMA);

/**
 * Annotated so the `action` switch below is checked for exhaustiveness: a
 * member added to the enum without a case makes the function fall off its end,
 * which a declared non-undefined return type refuses.
 */
type FrameManageResult =
  | ReturnType<typeof mcpResult>
  | ReturnType<typeof mcpError>;

async function frameManageHandler(
  client: ToolClient,
  rawInput: unknown,
): Promise<FrameManageResult> {
  // Parse, never assert: a raw ZodError stringifies its whole issue list into
  // `message`, so the issues are rewritten as one readable line.
  const parsed = frameInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return mcpError(
      new Error(
        parsed.error.issues
          .map(
            (issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`,
          )
          .join('; '),
      ),
    );
  }
  const { action, projectId, pageKey, frameId } = parsed.data;
  const validationError = validateActionInput(
    'frame_manage',
    action,
    { pageKey, frameId },
    FRAME_MANAGE_REQUIREMENTS,
  );
  if (validationError) return mcpError(new Error(validationError));

  try {
    const resolvedProjectId = resolveDefaultProject(client, projectId);
    if (!resolvedProjectId) {
      return mcpError(new Error(NO_DEFAULT_PROJECT_ERROR));
    }

    switch (action) {
      case 'list': {
        const { frames } = await client.listFrames({
          projectId: resolvedProjectId,
        });
        return mcpResult(
          { frames: frames.map(serializeLean) },
          {
            next:
              frames.length === 0
                ? [FRAME_HINT_NONE_YET]
                : [
                    FRAME_HINT_OPEN_PAGE_OR_GET,
                    FRAME_HINT_NAMES_ARE_DOCUMENTATION,
                  ],
          },
        );
      }
      case 'page': {
        assertParam(pageKey, 'pageKey', 'page');
        const { frames } = await client.listPageFrames({
          projectId: resolvedProjectId,
          pageKey,
        });
        return mcpResult(
          { pageKey, frames: frames.map(serializeFrame) },
          {
            next:
              frames.length === 0
                ? [FRAME_HINT_NONE_ON_PAGE]
                : [FRAME_HINT_MARK_SPACE, FRAME_HINT_READ_KNOWLEDGE],
          },
        );
      }
      case 'get': {
        assertParam(frameId, 'frameId', 'get');
        const frame = await client.getFrame({
          projectId: resolvedProjectId,
          frameId,
        });
        return mcpResult(
          { frame: serializeFrame(frame) },
          {
            next:
              frame.extends !== null
                ? [FRAME_HINT_EXTENDS_BASE, FRAME_HINT_READ_KNOWLEDGE]
                : [FRAME_HINT_READ_KNOWLEDGE],
          },
        );
      }
    }
  } catch (error) {
    // `mcpError` lifts a `code` property off the error, so whatever the client
    // raises surfaces its code without a branch here.
    return mcpError(error, errorHint(error, 'frames', FRAME_NOT_FOUND_HINT));
  }
}

/**
 * The tool as data, so it can be driven without an MCP transport (tests, and
 * any in-process bridge).
 */
export function createFrameManageToolSpec(client: ToolClient): ToolSpec {
  return {
    name: 'frame_manage',
    title: TITLE,
    description: FRAME_MANAGE_DESCRIPTION,
    inputSchema: FRAME_MANAGE_INPUT_SCHEMA,
    annotations,
    handler: (input) => frameManageHandler(client, input),
  };
}

export function registerFrameManageTool(server: McpServer, client: ToolClient) {
  const spec = createFrameManageToolSpec(client);
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.inputSchema,
      annotations: spec.annotations,
    },
    (args) => frameManageHandler(client, args),
  );
}
