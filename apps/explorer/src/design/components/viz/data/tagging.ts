/**
 * The tagging demo's script and what it shows at a time: markup typed onto a
 * page element, the element lighting up per tagged part, a click, and the
 * events in a table. taggingFrame() is a pure function of the script and the
 * time. Imports only package-free demo parts.
 */
import { tok, type CodeToken, type TokenKind } from '../../codeTokens';
import type { ThumbKind } from '../parts/Thumb';
import { clamp, ease } from '../parts/timeline';
import { truncate, typedLength } from '../parts/tokens';

/**
 * One line of the code pane, as it ends.
 *
 * Typing: the line's walkerOS attributes (each `data-elb*` name with its `=`
 * and value, and the space before it unless that space starts the line) are
 * typed between `typeFrom` and `typeTo`; whatever stands between two of them is
 * typed with them, and the rest of the line is there from the start. A line
 * of only whitespace and walkerOS attributes appears when it comes on. A line
 * without walkerOS attributes types nothing.
 *
 * Pills: once typed, a line that lights no part shows its `data-elb` value as
 * an entity pill and its `data-elbaction` value as an action pill on the card;
 * the first entity pill marks the card as tagged.
 */
export interface TaggingLine {
  id: string;
  tokens: readonly CodeToken[];
  /** Typing starts, in ms. */
  typeFrom: number;
  /** Typing ends, in ms. */
  typeTo: number;
  /** The id of the card part that lights once the line is typed. */
  lights?: string;
  /** The line comes on and takes the caret, in ms; `typeFrom` when left out. */
  showFrom?: number;
}

export interface TaggingCardPart {
  id: string;
  text: string;
  role: 'kicker' | 'title' | 'meta' | 'action';
}

/** The page element the markup tags, drawn as a card. */
export interface TaggingCard {
  thumb?: ThumbKind;
  parts: readonly TaggingCardPart[];
}

/** An event the table lists from `at` (ms). */
export interface TaggingEvent {
  name: string;
  data: Readonly<Record<string, string>>;
  at: number;
}

export interface TaggingScript {
  lines: readonly TaggingLine[];
  card: TaggingCard;
  events: readonly TaggingEvent[];
  /** A cursor moves onto the card part `part` and clicks it at `at` (ms). */
  click?: { part: string; at: number };
  /** The file name in the code pane's bar; the bar shows no name without it. */
  file?: string;
  /**
   * The length of one loop, in ms: the card and code fade in at its start, the
   * card slides out and the cursor fades before its end. Without it, the end
   * state holds.
   */
  loop?: number;
}

export interface TaggingFrameLine {
  readonly id: string;
  /** The line's number among the lines shown, from 1. */
  readonly n: number;
  readonly tokens: readonly CodeToken[];
  readonly on: boolean;
  /** How many tokens stand before the caret; null without a caret. */
  readonly caret: number | null;
}

export interface TaggingPill {
  readonly part: 'entity' | 'action';
  readonly text: string;
}

export interface TaggingRow {
  readonly key: string;
  readonly name: string;
  readonly data: Readonly<Record<string, string>>;
  /** Milliseconds since the event. */
  readonly age: number;
}

export interface TaggingFrame {
  readonly lines: readonly TaggingFrameLine[];
  /** The code pane's opacity. */
  readonly fade: number;
  readonly caretOn: boolean;
  readonly card: {
    readonly opacity: number;
    readonly offset: number;
    readonly tagged: boolean;
    readonly pills: readonly TaggingPill[];
    /** The ids of the lit parts, in the card's order. */
    readonly lit: readonly string[];
  };
  /** Null without a click. */
  readonly cursor: {
    readonly x: number;
    readonly y: number;
    readonly opacity: number;
    readonly ring: number;
    readonly ringOpacity: number;
    readonly pressed: boolean;
  } | null;
  readonly rows: readonly TaggingRow[];
}

// A line that starts with an attribute or a tag's end continues a tag opened
// on an earlier line.
const CONTINUES_TAG = /^\s*(?:[^\s=<>"']+=|\/?>)/;

/** Lexemes inside a tag, each with its colour role. */
const IN_TAG: ReadonlyArray<readonly [RegExp, TokenKind]> = [
  [/^\s+/, 'punct'],
  [/^\/?>/, 'tag'],
  [/^=/, 'punct'],
  [/^"[^"]*"?|^'[^']*'?/, 'str'],
  [/^[^\s=>"'/]+/, 'attr'],
];

/** Lexemes between tags. */
const OUTSIDE: ReadonlyArray<readonly [RegExp, TokenKind]> = [
  [/^<\/[^>]*>?/, 'tag'],
  [/^<[^\s>/]+/, 'tag'],
  [/^[^<]+/, 'text'],
];

const UNQUOTED_VALUE = /^[^\s>"']+/;

/**
 * One line of HTML as coloured tokens: tags, attribute names, `=` and values,
 * text. The tokens join to the line. A line that starts with an attribute is
 * read as the rest of a tag.
 */
export function htmlTokens(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let inTag = CONTINUES_TAG.test(line);
  let value = false;
  let rest = line;
  const indent = /^\s+/.exec(rest);
  if (indent && !inTag) {
    tokens.push(tok(indent[0], 'punct'));
    rest = rest.slice(indent[0].length);
  }
  while (rest.length > 0) {
    let text = rest.charAt(0);
    let kind: TokenKind = 'punct';
    const unquoted = inTag && value ? UNQUOTED_VALUE.exec(rest) : null;
    if (unquoted) {
      text = unquoted[0];
      kind = 'str';
    } else {
      for (const [pattern, role] of inTag ? IN_TAG : OUTSIDE) {
        const match = pattern.exec(rest);
        if (match) {
          text = match[0];
          kind = role;
          break;
        }
      }
    }
    if (inTag) {
      if (kind === 'tag') inTag = false;
      value = text === '=';
    } else if (kind === 'tag' && !text.startsWith('</')) {
      inTag = true;
    }
    tokens.push(tok(text, kind));
    rest = rest.slice(text.length);
  }
  return tokens;
}

// Timing, in ms. The card and the code fade in over the loop's start and out
// before its end; the cursor shows, travels and presses relative to the click.
const FADE_IN = 250;
const SLIDE_IN = 500;
const SLIDE_OUT_BEFORE_END = 700;
const SLIDE_OUT = 600;
const SLIDE_DISTANCE = 190;
const CODE_FADE_BEFORE_END = 900;
const CODE_FADE_TAIL = 150;
const CURSOR_SHOWS_BEFORE_CLICK = 1150;
const CURSOR_MOVES_BEFORE_CLICK = 950;
const CURSOR_TRAVEL = 800;
const CURSOR_FADE = 200;
const PRESS = 180;
const RIPPLE = 550;
const BLINK = 900;
const BLINK_ON = 500;

// The cursor's resting point on the clicked part, and where it comes from (px).
const CURSOR_X = 22;
const CURSOR_Y = 11;
const CURSOR_FROM_X = 190;
const CURSOR_FROM_Y = -80;

const MAX_ROWS = 24;
const WALKER_ATTRIBUTE = /^data-elb/;

function isSpace(token: CodeToken | undefined): boolean {
  return token !== undefined && token.t.trim() === '';
}

/** The token range a line types, its walkerOS attributes; null when it has none. */
function typedRange(
  tokens: readonly CodeToken[],
): readonly [number, number] | null {
  let from = -1;
  let to = -1;
  tokens.forEach((token, index) => {
    if (token.kind !== 'attr' || !WALKER_ATTRIBUTE.test(token.t)) return;
    let end = index;
    if (tokens[end + 1]?.t === '=') end += 1;
    if (end > index && tokens[end + 1]?.kind === 'str') end += 1;
    if (from < 0)
      from = index > 1 && isSpace(tokens[index - 1]) ? index - 1 : index;
    to = end;
  });
  return from < 0 ? null : [from, to];
}

/** The walkerOS attributes of a line with their unquoted values. */
function walkerAttributes(
  tokens: readonly CodeToken[],
): Array<{ name: string; value: string }> {
  const found: Array<{ name: string; value: string }> = [];
  tokens.forEach((token, index) => {
    const value = tokens[index + 2];
    if (
      token.kind === 'attr' &&
      WALKER_ATTRIBUTE.test(token.t) &&
      tokens[index + 1]?.t === '=' &&
      value?.kind === 'str'
    )
      found.push({ name: token.t, value: value.t.replace(/^["']|["']$/g, '') });
  });
  return found;
}

interface LinePlan {
  readonly line: TaggingLine;
  readonly showFrom: number;
  readonly range: readonly [number, number] | null;
  /** True when the line is only whitespace around its walkerOS attributes. */
  readonly added: boolean;
}

function planLine(line: TaggingLine): LinePlan {
  const range = typedRange(line.tokens);
  const added =
    range !== null &&
    line.tokens.every(
      (token, index) =>
        (index >= range[0] && index <= range[1]) || isSpace(token),
    );
  return { line, showFrom: line.showFrom ?? line.typeFrom, range, added };
}

function typedChars(line: TaggingLine, length: number, t: number): number {
  if (line.typeTo <= line.typeFrom) return t >= line.typeTo ? length : 0;
  return Math.round(
    clamp((t - line.typeFrom) / (line.typeTo - line.typeFrom)) * length,
  );
}

function frameLines(
  plans: readonly LinePlan[],
  caretId: string | undefined,
  t: number,
): TaggingFrameLine[] {
  return plans
    .filter((plan) => !plan.added || t >= plan.showFrom)
    .map(({ line, range, showFrom }, index) => {
      if (!range)
        return {
          id: line.id,
          n: index + 1,
          tokens: line.tokens,
          on: false,
          caret: null,
        };
      const prefix = line.tokens.slice(0, range[0]);
      const run = line.tokens.slice(range[0], range[1] + 1);
      const typed = truncate(run, typedChars(line, typedLength(run), t));
      return {
        id: line.id,
        n: index + 1,
        tokens: [...prefix, ...typed, ...line.tokens.slice(range[1] + 1)],
        on: t >= showFrom,
        caret: line.id === caretId ? prefix.length + typed.length : null,
      };
    });
}

/** The line holding the caret: the latest typed line to come on, until typing is over. */
function caretLine(
  script: TaggingScript,
  plans: readonly LinePlan[],
  t: number,
): string | undefined {
  const typed = plans.filter((plan) => plan.range !== null);
  const end = script.click
    ? script.click.at - CURSOR_MOVES_BEFORE_CLICK
    : Math.max(...typed.map((plan) => plan.line.typeTo));
  if (t >= end) return undefined;
  let current: LinePlan | undefined;
  for (const plan of typed)
    if (plan.showFrom <= t && (!current || plan.showFrom >= current.showFrom))
      current = plan;
  return current?.line.id;
}

function pills(plans: readonly LinePlan[], t: number): TaggingPill[] {
  return plans
    .filter(({ line }) => line.lights === undefined && t >= line.typeTo)
    .flatMap(({ line }) => walkerAttributes(line.tokens))
    .flatMap(({ name, value }): TaggingPill[] =>
      name === 'data-elb'
        ? [{ part: 'entity', text: value }]
        : name === 'data-elbaction'
          ? [{ part: 'action', text: value }]
          : [],
    );
}

function cursor(
  click: { part: string; at: number },
  loop: number | undefined,
  t: number,
): NonNullable<TaggingFrame['cursor']> {
  const fadeOut = loop === undefined ? Infinity : loop - CODE_FADE_BEFORE_END;
  const shownFrom = click.at - CURSOR_SHOWS_BEFORE_CLICK;
  const move = ease(
    clamp((t - (click.at - CURSOR_MOVES_BEFORE_CLICK)) / CURSOR_TRAVEL),
  );
  const ripple = clamp((t - click.at) / RIPPLE);
  const shown = t >= shownFrom && t < fadeOut + CURSOR_FADE;
  const fading = t > fadeOut ? 1 - clamp((t - fadeOut) / CURSOR_FADE) : 1;
  return {
    x: CURSOR_X + (1 - move) * CURSOR_FROM_X,
    y: CURSOR_Y + (1 - move) * CURSOR_FROM_Y,
    opacity: shown ? clamp((t - shownFrom) / CURSOR_FADE) * fading : 0,
    ring: 1 + ripple * 1.8,
    ringOpacity: t >= click.at ? (1 - ripple) * 0.9 : 0,
    pressed: t >= click.at && t < click.at + PRESS,
  };
}

function rows(events: readonly TaggingEvent[], t: number): TaggingRow[] {
  return events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.at <= t)
    .sort((a, b) => b.event.at - a.event.at || b.index - a.index)
    .slice(0, MAX_ROWS)
    .map(({ event, index }) => ({
      key: String(index),
      name: event.name,
      data: event.data,
      age: t - event.at,
    }));
}

/** Everything the tagging demo shows of `script` at `t` (ms). */
export function taggingFrame(script: TaggingScript, t: number): TaggingFrame {
  const { loop } = script;
  const plans = script.lines.map(planLine);
  const shownPills = pills(plans, t);
  const slideOutStart =
    loop === undefined ? Infinity : loop - SLIDE_OUT_BEFORE_END;
  const codeFadeStart =
    loop === undefined ? Infinity : loop - CODE_FADE_BEFORE_END;
  const slideIn = ease(clamp(t / SLIDE_IN));
  const slideOut = ease(clamp((t - slideOutStart) / SLIDE_OUT));
  return {
    lines: frameLines(plans, caretLine(script, plans, t), t),
    fade:
      loop === undefined
        ? 1
        : t < FADE_IN
          ? t / FADE_IN
          : t > codeFadeStart
            ? 1 -
              clamp(
                (t - codeFadeStart) / (CODE_FADE_BEFORE_END - CODE_FADE_TAIL),
              )
            : 1,
    caretOn:
      script.lines.some(
        (line) =>
          typedRange(line.tokens) && t >= line.typeFrom && t <= line.typeTo,
      ) || t % BLINK < BLINK_ON,
    card: {
      opacity: loop === undefined ? 1 : clamp(t / FADE_IN) * (1 - slideOut),
      offset:
        loop === undefined
          ? 0
          : t >= slideOutStart
            ? -slideOut * SLIDE_DISTANCE
            : (1 - slideIn) * SLIDE_DISTANCE,
      tagged: shownPills.some((pill) => pill.part === 'entity'),
      pills: shownPills,
      lit: script.card.parts
        .filter((part) =>
          script.lines.some(
            (line) => line.lights === part.id && t >= line.typeTo,
          ),
        )
        .map((part) => part.id),
    },
    cursor: script.click ? cursor(script.click, loop, t) : null,
    rows: rows(script.events, t),
  };
}

/** One sentence per line or click that names a part the card does not have. */
export function unknownParts(script: TaggingScript): string[] {
  const ids = new Set(script.card.parts.map((part) => part.id));
  const found = script.lines
    .filter((line) => line.lights !== undefined && !ids.has(line.lights))
    .map(
      (line) =>
        `TaggingViz: line "${line.id}" lights part "${line.lights}", which the card does not have.`,
    );
  if (script.click && !ids.has(script.click.part))
    found.push(
      `TaggingViz: the click names part "${script.click.part}", which the card does not have.`,
    );
  return found;
}
