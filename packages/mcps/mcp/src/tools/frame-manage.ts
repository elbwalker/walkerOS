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
 * It composes with `hub_manage` through ids: a mark id read here is the
 * `markId` that tool's "knowledge" action takes, which is why mark ids stay
 * literal while everything else inside a mark is wrapped as user data.
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
  'A frame name is documentation; the marks inside it carry the meaning. A frame that extends another stores only what it adds. ' +
  'Use hub_manage action "knowledge" with a frameId or markId to read what people wrote on a frame. ' +
  'A markId is an id read from the marks of a frame here: mark ids come back literal so they can be passed straight back, while the text around them is wrapped as data. ' +
  'An entity action is an object carrying its id beside the raw attribute text, because the id is the address and the raw text is not.';

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
  'Marks are in their frame’s own 0..1 space; a child frame sits inside its parent through placements[].rect.';
export const FRAME_HINT_READ_KNOWLEDGE =
  'Use hub_manage action "knowledge" with frameId (and markId) to read what people wrote here. A markId is an id from these marks, and an entity action is addressed by its own id, never by its raw text.';
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
 * The address of one action inside an entity, composed exactly as the app
 * composes it in `components/src/tag-plan/model.ts` (`actionChipId`). Byte
 * exactness is the whole contract: the id embeds the raw text verbatim, and
 * neutralising anything in it would name a mark that was never stored.
 */
function actionMarkId(entityId: string, raw: string): string {
  return `${entityId}#action.${raw}`;
}

/**
 * The rule for everything inside a mark, in one place.
 *
 *  - An IDENTIFIER stays literal wherever it appears, including as an element
 *    of an array, because it is an address another tool consumes and has to be
 *    passed back exactly as it came.
 *  - User-authored PROSE is always wrapped, so it cannot close the envelope and
 *    be read as instructions.
 *  - Where an identifier EMBEDS user text, the identifier is still literal. A
 *    sanitised id names a mark the app never stored, so cleaning it would trade
 *    a working address for a silent lookup failure.
 *
 * Marks are a passthrough record, so this cannot lean on a shared list of
 * "structural" key names: a client writes whatever keys it likes, and a name
 * that means "identifier" in a flow config means nothing here. Only the names
 * below are addresses in a mark, and every one of them is consumed by
 * `hub_manage`.
 */

/** Keys whose value is a single address. */
const MARK_ADDRESS_KEYS = new Set([
  // The mark id itself, and a component of the data and action addresses.
  'id',
  // The first half of an ambient address, `ambient.<kind>.<key>`, and the
  // discriminator a reader branches on.
  'kind',
  // An entity's pointer at another entity, which is that entity's mark id.
  'link',
  // The thread a note became, which action "note_add" takes as threadId.
  'threadRef',
]);

/** Keys whose value is an ARRAY of addresses. A skip predicate cannot express
 *  this: array elements have no key of their own to exempt them by. */
const MARK_ADDRESS_LIST_KEYS = new Set([
  // The entities a context band covers, by their mark ids.
  'covers',
]);

/**
 * Subtrees where NOTHING is an address, whatever it is called.
 *
 * A name in the sets above means "address" at the level a mark lives at, and
 * something else further down. `id` is the clearest case: on a mark it is the
 * mark id, but inside an anchor it is `el.id` read straight off the host page,
 * which no tool takes back and the app uses only as a display label. Matching
 * on the bare name would hand that page string back unwrapped while its own
 * `testid` and `name` siblings wrapped, which is one small object with two
 * different treatments.
 *
 * So the exemption is anchored to WHERE mark ids live rather than to the
 * spelling of a key. An anchor is page data end to end, the same class of thing
 * this tool already drops from a placement, and nothing an anchor holds is
 * consumed as an address. Everything under one is text.
 *
 * Both keys carry the same `Anchor` shape: a mark's own anchor, and the
 * per-action anchors keyed by raw action text.
 */
const MARK_PAGE_DATA_KEYS = new Set(['anchor', 'actionAnchors']);

/**
 * Whether a record's KEYS are prose rather than addresses.
 *
 * Object keys are never wrapped, which is deliberate and load-bearing: it is
 * what keeps a `notes` key usable, since those keys ARE composed mark ids. The
 * same mechanism hands back any key that is page text instead. So a record is
 * one of two things, and only prose-keyed ones are reshaped into pairs.
 *
 * `data` is the case where one name is both. On an ambient node the property
 * name is the second half of `ambient.<kind>.<key>`, so it is an address and
 * the record keeps its shape. On a context there is no `kind` to compose with
 * and no id built from its property names, so the same name is prose. The test
 * is therefore for the `kind` that does the composing, not for the shape of the
 * parent, which is what makes it a statement about meaning rather than a guess.
 */
function isProseKeyedRecord(
  key: string,
  owner: Record<string, unknown>,
): boolean {
  return key === 'data' && typeof owner.kind !== 'string';
}

/**
 * Walks a mark document applying the rule above.
 *
 * Actions are the one case that needs more than an exemption. They are stored
 * as bare page attribute text, so the text must stay wrapped, yet the address
 * derived from it has to be readable. The derived id is therefore emitted
 * BESIDE the still-wrapped text rather than in place of it, the same shape a
 * `notes` key already has. The pairing is keyed off shape rather than position,
 * so an entity nested under another is covered without this file knowing the
 * plan's layout, and `actions` is the only stored field of that name.
 */
function walkMarks(value: unknown, inPageData = false): unknown {
  if (typeof value === 'string') return wrapUserData(value);
  if (Array.isArray(value)) {
    return value.map((item) => walkMarks(item, inPageData));
  }
  if (!isRecord(value)) return value;

  const entityId = typeof value.id === 'string' ? value.id : undefined;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (MARK_PAGE_DATA_KEYS.has(key)) {
      out[key] = walkMarks(child, true);
    } else if (
      !inPageData &&
      isRecord(child) &&
      isProseKeyedRecord(key, value)
    ) {
      out[key] = proseKeyedPairs(child);
    } else {
      out[key] = walkMarkEntry(key, child, entityId, inPageData);
    }
  }
  return out;
}

/** A prose-keyed record as pairs, so the key is wrapped like the value it
 *  labels instead of riding out as a literal object key. */
function proseKeyedPairs(record: Record<string, unknown>) {
  return Object.entries(record).map(([key, value]) => ({
    key: wrapUserData(key),
    value: walkMarks(value),
  }));
}

function walkMarkEntry(
  key: string,
  child: unknown,
  entityId: string | undefined,
  inPageData: boolean,
): unknown {
  // Inside a page-data subtree no name is an address, so every rule below is
  // skipped and the value is text like anything else.
  if (inPageData) return walkMarks(child, true);

  if (MARK_ADDRESS_KEYS.has(key) && typeof child === 'string') return child;

  if (MARK_ADDRESS_LIST_KEYS.has(key) && Array.isArray(child)) {
    // A non-string element is not an address, so it is walked like anything
    // else rather than passed through unseen.
    return child.map((item) =>
      typeof item === 'string' ? item : walkMarks(item),
    );
  }

  if (key === 'actions' && entityId !== undefined && Array.isArray(child)) {
    return child.map((raw) =>
      typeof raw === 'string'
        ? { id: actionMarkId(entityId, raw), raw: wrapUserData(raw) }
        : walkMarks(raw),
    );
  }

  return walkMarks(child);
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
