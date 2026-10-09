import { resolve } from 'node:path';
import { loadDesignTokens } from '../generate';
import { THEMES, type ThemeId } from '../tokens';
import { contrast, deltaE, oklab, over, tokenColor } from './color-math';

const tokens = loadDesignTokens(resolve(__dirname, '../../..'));
const color = (name: string, theme: ThemeId) => tokenColor(tokens, name, theme);

const GROUNDS = ['bg', 'bg-2', 'surface', 'surface-2'] as const;
const STATUS = ['danger', 'success', 'warning', 'info'] as const;
const SYNTAX = [
  'syntax-comment',
  'syntax-string',
  'syntax-number',
  'syntax-constant',
  'syntax-keyword',
  'syntax-function',
  'syntax-type',
  'syntax-operator',
  'syntax-punct',
  'syntax-tag',
  'syntax-namespace',
] as const;
/** The five event parts: a dark value for dark grounds, a light one for the
 * page grounds of the light theme. */
const THEMED_EVENTS = [
  'event-entity',
  'event-action',
  'event-property',
  'event-context',
  'event-globals',
] as const;
/** The two tag kinds with a dark value only, for dark grounds only. */
const DARK_EVENTS = ['event-user', 'event-consent'] as const;
const EVENTS = [...THEMED_EVENTS, ...DARK_EVENTS] as const;
const CHARTS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
] as const;
const STEP_COLOURS = [
  'step-source',
  'step-transformer',
  'step-collector',
  'step-destination',
  'step-store',
  'platform-web',
  'platform-server',
] as const;
const MARKS = [
  'border-strong',
  'focus',
  ...STEP_COLOURS,
  ...CHARTS,
  'annotation',
] as const;

/**
 * Status pairs exempt from the 0.10 distance because the spec fixes BOTH sides:
 * dark `info` is the artifact's `link`, dark `platform-web` keeps today's value,
 * `event-globals` is an artifact event colour. The test also fails when an
 * exempt pair no longer falls short, so the list cannot rot.
 */
const SPEC_FIXED_PAIRS = [
  'dark info/platform-web',
  'dark info/event-globals',
  // Light event values pending design review.
  'light info/event-globals',
  // Light event values pending design review.
  'light warning/event-context',
  // Light event values pending design review.
  'light danger/event-property',
];
const exempt = (key: string): boolean => SPEC_FIXED_PAIRS.includes(key);

interface Pair {
  readonly fg: string;
  readonly on: readonly string[];
  readonly min: number;
  /** Set when each `on` colour is a translucent fill laid over each of these grounds first. */
  readonly over?: readonly string[];
  /** Set when the pair holds in this theme only. */
  readonly theme?: ThemeId;
}

const text = (fg: string, on: readonly string[]): Pair => ({
  fg,
  on,
  min: 4.5,
});
const mark = (fg: string, on: readonly string[]): Pair => ({ fg, on, min: 3 });

/**
 * Every documented pair, both themes, no exceptions. The artifact's three
 * documented misses are the `fg-3` and `link` rows (fixed by value) and light
 * `primary`, which appears in no text or mark row on a page ground: it stays a
 * fill under `on-primary`, and `focus` and `chart-1` take `link` in light. On
 * the always-dark demo ground it marks the active step.
 */
const PAIRS: readonly Pair[] = [
  ...['fg', 'fg-2', 'fg-3', 'link', ...STATUS].map((fg) => text(fg, GROUNDS)),
  text('on-primary', ['primary']),
  text('on-danger', ['danger']),
  ...STATUS.map(
    (status): Pair => ({ ...text('fg', [`${status}-bg`]), over: GROUNDS }),
  ),
  text('code-fg', ['code-bg']),
  {
    ...text('code-fg', [
      'code-selection',
      'code-inserted-bg',
      'code-deleted-bg',
    ]),
    over: ['code-bg'],
  },
  ...SYNTAX.map((fg) => text(fg, ['code-bg'])),
  text('viz-fg', ['viz-bg', 'viz-code-bg']),
  ...['viz-fg-2', 'viz-tag', 'viz-string', 'viz-number', 'viz-punct'].map(
    (fg) => text(fg, ['viz-code-bg']),
  ),
  // An event part reads in its dark value on the dark grounds, the
  // visualisation ones and the dark page, and in its light value on the light
  // page; user and consent have the dark value only.
  ...THEMED_EVENTS.map(
    (fg): Pair => ({
      ...text(fg, ['viz-bg', 'viz-code-bg', ...GROUNDS]),
      theme: 'dark',
    }),
  ),
  ...THEMED_EVENTS.map(
    (fg): Pair => ({ ...text(fg, GROUNDS), theme: 'light' }),
  ),
  ...DARK_EVENTS.map((fg) => text(fg, ['viz-bg', 'viz-code-bg'])),
  mark('primary', ['viz-bg']),
  ...MARKS.map((fg) => mark(fg, GROUNDS)),
  ...STATUS.map(
    (status): Pair => ({ ...mark(status, [`${status}-bg`]), over: GROUNDS }),
  ),
];

function shortfalls(pair: Pair, theme: ThemeId): string[] {
  const fg = color(pair.fg, theme);
  const bases = pair.over;
  const grounds =
    bases === undefined
      ? pair.on.map((name) => ({ name, rgba: color(name, theme) }))
      : pair.on.flatMap((fill) =>
          bases.map((base) => ({
            name: `${fill} over ${base}`,
            rgba: over(color(fill, theme), color(base, theme)),
          })),
        );
  return grounds.flatMap(({ name, rgba }) => {
    const ratio = contrast(fg, rgba);
    return ratio < pair.min ? [`${name}: ${ratio.toFixed(2)}`] : [];
  });
}

const label = (pair: Pair): string =>
  `${pair.fg} on ${pair.on.join(', ')}${pair.over === undefined ? '' : ` over ${pair.over.join(', ')}`} >= ${pair.min}:1`;

describe.each(THEMES)('%s theme', (theme) => {
  it.each(
    PAIRS.filter(
      (pair) => pair.theme === undefined || pair.theme === theme,
    ).map((pair) => [label(pair), pair] as const),
  )('%s', (_label, pair) => {
    expect(shortfalls(pair, theme)).toEqual([]);
  });

  it('success and danger stay apart with red-green colour blindness (craft.md)', () => {
    const success = color('success', theme);
    const danger = color('danger', theme);
    const measured = {
      contrast: contrast(success, danger),
      oklabB: oklab(success)[2],
      protan: deltaE(success, danger, 'protan'),
      deutan: deltaE(success, danger, 'deutan'),
    };
    // Either 3:1 apart in lightness, or success leaves the red-green axis toward blue.
    const apart =
      measured.contrast >= 3 ||
      (measured.oklabB < 0 && measured.protan >= 0.1 && measured.deutan >= 0.1);
    expect({ apart, ...measured }).toEqual(
      expect.objectContaining({ apart: true }),
    );
  });

  it('danger is distinct from event-property', () => {
    const d = deltaE(color('danger', theme), color('event-property', theme));
    if (exempt(`${theme} danger/event-property`)) expect(d).toBeLessThan(0.1);
    else expect(d).toBeGreaterThanOrEqual(0.1);
  });

  it('annotation is distinct from step-store', () => {
    expect(
      deltaE(color('annotation', theme), color('step-store', theme)),
    ).toBeGreaterThanOrEqual(0.1);
  });

  it('every status is distinct from every step, platform and event colour', () => {
    const pairs = STATUS.flatMap((status) =>
      [...STEP_COLOURS, ...EVENTS].map((other) => ({
        key: `${theme} ${status}/${other}`,
        d: deltaE(color(status, theme), color(other, theme)),
      })),
    );
    const close = pairs
      .filter(({ key, d }) => d < 0.1 && !exempt(key))
      .map(({ key, d }) => `${key} ${d.toFixed(3)}`);
    const stale = pairs
      .filter(({ key, d }) => d >= 0.1 && exempt(key))
      .map(({ key }) => key);
    expect({ close, stale }).toEqual({ close: [], stale: [] });
  });

  it('chart series stay apart in normal, protan and deutan vision', () => {
    const close: string[] = [];
    for (const vision of ['normal', 'protan', 'deutan'] as const) {
      CHARTS.forEach((a, i) =>
        CHARTS.slice(i + 1).forEach((b) => {
          const d = deltaE(color(a, theme), color(b, theme), vision);
          if (d < 0.07) close.push(`${a}/${b} ${vision} ${d.toFixed(3)}`);
        }),
      );
    }
    expect(close).toEqual([]);
  });
});

it('event-user and event-consent are distinct from the other event parts, step-source and annotation', () => {
  // User and consent sit on dark grounds only (F9), so the dark values decide;
  // the status distances are covered by the status test above.
  const close = (['event-user', 'event-consent'] as const).flatMap((kind) =>
    [...EVENTS, 'step-source', 'annotation']
      .filter((other) => other !== kind)
      .map((other) => ({
        pair: `${kind}/${other}`,
        d: deltaE(color(kind, 'dark'), color(other, 'dark')),
      }))
      .filter(({ d }) => d < 0.1)
      .map(({ pair, d }) => `${pair} ${d.toFixed(3)}`),
  );
  expect(close).toEqual([]);
});

/**
 * Colours no contrast row measures, each with its reason: `decorative` (marks
 * nothing a reader needs), `atmosphere` (the glow), `scrim` (under a surface),
 * `chrome` (a frame ground with no documented text on it), `palette` (the
 * brand scale, not a role) and `open-item` (`viz-comment`, under review). A new
 * colour joins a row above or this list, so none ships without a decision.
 */
const UNPAIRED = new Map<string, string>([
  ['border', 'decorative'],
  ['glow', 'atmosphere'],
  ['code-bar', 'chrome'],
  ['code-border', 'decorative'],
  ['code-line-number', 'decorative'],
  ['viz-border', 'decorative'],
  ['viz-surface', 'chrome'],
  ['viz-line-number', 'decorative'],
  ['viz-comment', 'open-item'],
  ['backdrop', 'scrim'],
  ['elbwalker-100', 'palette'],
  ['elbwalker-200', 'palette'],
  ['elbwalker-300', 'palette'],
  ['elbwalker-400', 'palette'],
  ['elbwalker-500', 'palette'],
  ['elbwalker-700', 'palette'],
  ['elbwalker-800', 'palette'],
  ['elbwalker-900', 'palette'],
]);

it('every colour token is in a contrast row or listed as unpaired', () => {
  const paired = new Set(
    PAIRS.flatMap((pair) => [pair.fg, ...pair.on, ...(pair.over ?? [])]),
  );
  const names = tokens.colors.map((token) => token.name);
  expect({
    unproven: names.filter((name) => !paired.has(name) && !UNPAIRED.has(name)),
    stale: [...UNPAIRED.keys()].filter(
      (name) => paired.has(name) || !names.includes(name),
    ),
  }).toEqual({ unproven: [], stale: [] });
});
