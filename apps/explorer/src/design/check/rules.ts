/**
 * Rules of walkeros-design-check: pure functions over one file's text. The CLI
 * walks the files and applies the consumer's allowlists.
 */
import { forEachMatch } from '../names';
import { TAILWIND_VARIABLES } from '../tailwind-namespaces';

export const RULES = [
  'color-literal',
  'named-color',
  'palette-class',
  'white-black-class',
  'dark-variant',
  'shadow-class',
  'z-class',
  'text-size-class',
  'motion-class',
  'radius-class',
  'var-fallback',
  'undeclared-var',
  'color-scheme',
  'z-index',
  'motion-literal',
  'font-literal',
] as const;
export type RuleId = (typeof RULES)[number];

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly rule: RuleId;
  readonly match: string;
}

export interface ScanContext {
  /** Custom properties the design system declares (tokens.css, tailwind.css, base.css). */
  readonly designNames: ReadonlySet<string>;
  /** Custom properties declared anywhere under the scanned paths. */
  readonly declaredNames: ReadonlySet<string>;
  /** Consumer-supplied prefixes of third-party variables, such as `ifm-`. */
  readonly allowVarPrefixes: readonly string[];
  /**
   * Local custom properties (`--x-size`) and SCSS variables (`$size`) declared
   * with a literal length under the scanned paths, design names aside.
   */
  readonly literalLengths: ReadonlySet<string>;
}

const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown
  burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
  darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
  darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet
  deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro
  ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
  lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
  lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
  lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
  mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise
  mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab
  orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru
  pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
  seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
  teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(
    /\s+/,
  ),
);

/** Tailwind 4.3's palettes; the bridge resets all of them. */
const PALETTE =
  'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe';
const COLOR_UTILITY =
  'bg|text|border(?:-[xytrblse])?|outline|ring(?:-offset)?|divide|fill|stroke|from|via|to|placeholder|caret|accent|decoration|shadow|inset-shadow|drop-shadow|text-shadow';
const START = '(?<![A-Za-z0-9_-])';
const END = '(?![A-Za-z0-9_-])';
const SIDE = '(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?';
/** A Tailwind arbitrary value that does not read a variable: `[250ms]`, not `[var(--motion)]`. */
const LITERAL_ARBITRARY = '\\[(?![^\\]]*var\\()[^\\]\\s]+\\]';

/** Run on string literals (script, markup, svg) and @apply (styles) only, so comments and prose never fire. */
const CLASS_RULES: ReadonlyArray<readonly [RuleId, RegExp]> = [
  [
    'palette-class',
    new RegExp(
      `${START}(?:${COLOR_UTILITY})-(?:${PALETTE})-(?:50|[1-9]00|950)(?:/\\d+)?${END}`,
      'g',
    ),
  ],
  [
    'white-black-class',
    new RegExp(
      `${START}(?:${COLOR_UTILITY})-(?:white|black)(?:/\\d+)?${END}`,
      'g',
    ),
  ],
  ['dark-variant', new RegExp(`${START}dark:(?=[A-Za-z0-9_\\[!(-])`, 'g')],
  [
    'shadow-class',
    // Bare drop-shadow is flagged too (the reset removes it), but not a CSS
    // drop-shadow() call. Bare shadow is not: "shadow root" prose would fire.
    new RegExp(
      `${START}(?:(?:inset-|drop-|text-)?shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner)${END}|drop-shadow(?![A-Za-z0-9_(-]))`,
      'g',
    ),
  ],
  ['z-class', new RegExp(`${START}-?z-(?:\\d+|\\[-?\\d+\\])${END}`, 'g')],
  // An arbitrary size that reads a variable (`text-[length:var(--type-x-size)]`) is not flagged.
  [
    'text-size-class',
    new RegExp(
      `${START}text-(?:xs|sm|base|lg|xl|[2-9]xl|\\[(?:length:)?(?![^\\]]*var\\()(?:[\\d.]|(?:calc|clamp|min|max)\\()[^\\]\\s]*\\])${END}`,
      'g',
    ),
  ],
  // Tailwind's transition utilities read --motion and --ease; a zero duration, delay-* and animate-* are not flagged.
  [
    'motion-class',
    new RegExp(
      `${START}(?:duration-(?:[1-9]\\d*|(?!\\[0m?s\\])${LITERAL_ARBITRARY})|ease-(?:in-out|in|out|linear|${LITERAL_ARBITRARY}))${END}`,
      'g',
    ),
  ],
  // An arbitrary value that reads a design radius (`rounded-[calc(var(--radius-md)-1px)]`) is not flagged.
  [
    'radius-class',
    new RegExp(
      `${START}rounded${SIDE}(?:-(?:2xl|3xl|4xl|\\[(?![^\\]]*var\\(--radius-)[^\\]\\s]+\\]))?${END}`,
      'g',
    ),
  ],
];

const STYLE_FILE = /\.(?:css|scss)$/;
const HEX =
  /(?<![A-Za-z0-9&#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![A-Za-z0-9-])/g;
const COLOR_FUNCTION =
  /(?<![A-Za-z0-9-])(?:rgba?|hsla?|hwb|oklab|oklch|lab|lch)\([^)]*\)/g;
const CSS_COLOR_FUNCTION = /(?<![A-Za-z0-9_-])color\([^)]*\)/g;
const STYLE_DECLARATION =
  /(?<![A-Za-z0-9_-])([a-z-]*(?:color|background|border|outline|fill|stroke|shadow|caret|accent|decoration|column-rule)[a-z-]*)\s*:\s*([^;{}]+)/g;
const SCRIPT_COLOR_PROPERTY =
  /(?<![A-Za-z0-9_-])(?:color|background|backgroundColor|borderColor|outlineColor|fill|stroke|caretColor|accentColor)\s*[:=]\s*\{?\s*['"]([A-Za-z]+)['"]/g;
const WORD = /(?<![A-Za-z0-9_-])[A-Za-z]+(?![A-Za-z0-9_-])/g;
const URL_FUNCTION = /url\([^)]*\)/g;
const VAR_REFERENCE = /var\(\s*--([A-Za-z0-9_-]+)\s*(,)?/g;
const TAILWIND_VAR = /-\(--([A-Za-z0-9_-]+)\)/g;
const COLOR_SCHEME = /prefers-color-scheme/g;
/** CSS `z-index: <n>`, in style files and inside script strings (a stub's CSS template). */
const Z_INDEX_CSS = /(?<![A-Za-z0-9_-])z-index\s*:\s*-?\d+/g;
/** A style object's `zIndex: <n>`. */
const Z_INDEX_SCRIPT = /(?<![A-Za-z0-9_-])zIndex\s*:\s*['"]?-?\d+/g;
/**
 * A CSS declaration a design variable sets, in style files and inside script
 * strings (a stub's CSS template, a Tailwind `[transition:...]` property).
 */
const CSS_STYLE =
  /(?<![A-Za-z0-9_-])(font-size|font-family|font|transition-duration|transition-timing-function|transition)\s*:\s*((?:\$\{[^}]*\}|[^;{}\]])+)/g;
/** A style object's key or JSX attribute with a literal value: `fontSize: 12`, `fontFamily="Inter"`. */
const SCRIPT_STYLE =
  /(?<![A-Za-z0-9_-])(fontSize|fontFamily|transitionDuration|transitionTimingFunction|transition)\s*(?::|=\{?)\s*('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`|\d*\.?\d+(?![\w.]))/g;
const NUMBER = /^\d*\.?\d+$/;
/** A value inside one pair of quotes or backticks: `"10"` is the number 10. */
const QUOTED = /^(['"`])([\s\S]*)\1$/;
/** A time (`150ms`, `.2s`) or an easing other than `var(--ease)`; a zero time is no motion. */
const MOTION_LITERAL =
  /(?<![A-Za-z0-9-])(?:cubic-bezier|steps|linear)\([^)]*\)|(?<![A-Za-z0-9.-])(?:(?:\d+(?:\.\d+)?|\.\d+)m?s|ease-in-out|ease-in|ease-out|ease|linear|step-start|step-end)(?![A-Za-z0-9-])/g;
/** A length or a keyword size. */
const LENGTH =
  '(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:px|rem|em|pt|%|vw|vh|vmin|vmax|ch|ex|lh|rlh|cqw|cqh|cqi)';
const SIZE_LITERAL = new RegExp(
  `(?<![A-Za-z0-9.-])(?:${LENGTH}|xxx-large|xx-large|x-large|xx-small|x-small|smaller|small|medium|larger|large)(?![A-Za-z0-9-])`,
  'g',
);
/** A custom property or SCSS variable declaration: CSS, a style object's key, a Tailwind `[--x:...]`. */
const VARIABLE_DECLARATION =
  /(?<![A-Za-z0-9_-])(--[A-Za-z0-9_-]+|\$[A-Za-z_][\w-]*)['"]?\s*:\s*['"`]?([^;{}'"`\n\]]+)/g;
/** A read of a custom property or an SCSS variable. */
const VARIABLE_READ =
  /var\(\s*(--[A-Za-z0-9_-]+)|(?<![\w-])(\$[A-Za-z_][\w-]*)/g;
/** In the transition shorthand, `var(--motion)` takes the duration's place. */
const MOTION_TOKEN = new RegExp(
  `var\\(--motion\\)|${MOTION_LITERAL.source}`,
  'g',
);
/** What the font shorthand sets beside its family: style, variant, weight and stretch keywords. */
const FONT_KEYWORD =
  /(?<![\w-])(?:normal|italic|oblique|small-caps|bold|bolder|lighter|(?:ultra-|extra-|semi-)?(?:condensed|expanded))(?![\w-])/g;
/** A fluid size whose max is a type style: `clamp(38px, 6vw, var(--type-display-size))`. */
const FLUID_TYPE =
  /clamp\((?:[^()]|\([^()]*\))*,\s*var\(--type-[a-z0-9-]+-size\)\s*\)/g;
/** A CSS block comment or an SCSS line comment. */
const COMMENT = /\/\*[\s\S]*?\*\/|(?<=^|\s)\/\/[^\n]*/g;
/** `@font-face` names a family; its font-family is not a use of one. */
const FONT_FACE = /@font-face\s*\{[^}]*\}/g;
const CSS_WIDE = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
]);
const STRING_LITERAL =
  /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;
const APPLY = /@apply\s+[^;}]+/g;
/** A string literal or a script comment, left to right, so `//` inside a string is no comment. */
const SCRIPT_TOKEN = new RegExp(
  `${STRING_LITERAL.source}|\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/`,
  'g',
);
interface Region {
  readonly offset: number;
  readonly text: string;
}

const within = (regions: readonly Region[], index: number): boolean =>
  regions.some(
    (region) =>
      index >= region.offset && index < region.offset + region.text.length,
  );

/** True when a font-family value names a family itself instead of reading `var(--font-*)`. */
function literalFamily(value: string): boolean {
  let rest = value.replace(/\$\{[^}]*\}/g, ' ').replace(/!important/g, ' ');
  for (let previous = ''; previous !== rest; ) {
    previous = rest;
    rest = rest.replace(/var\([^()]*\)/g, ' ');
  }
  return (rest.match(/[A-Za-z0-9_-]+/g) ?? []).some(
    (word) => !CSS_WIDE.has(word),
  );
}

/** True when the font shorthand names a family itself, beside its size, line height and keywords. */
function shorthandFamily(value: string): boolean {
  return literalFamily(
    value
      .replace(SIZE_LITERAL, ' ')
      .replace(/(?<![\w.-])\d*\.?\d+(?![\w.])/g, ' ')
      .replace(FONT_KEYWORD, ' ')
      .replace(/(?<![\w-])(?:calc|clamp|min|max)\(/g, '(')
      .replace(/\//g, ' '),
  );
}

/** Each character of a comment as a space: offsets and line breaks stay. */
const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

/** For each index of a value, the number of its top-level comma item. */
function commaItems(value: string): (index: number) => number {
  const commas: number[] = [];
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && depth === 0) commas.push(i);
  }
  return (index) => commas.filter((comma) => comma < index).length;
}

type Add = (rule: RuleId, index: number, match: string) => void;

interface StyleScan {
  readonly add: Add;
  /** Transition values, where motion-class does not fire. */
  readonly motionValues: Region[];
  readonly literalLengths: ReadonlySet<string>;
}

/**
 * The custom properties (`--x-size`) and SCSS variables (`$size`) one file
 * declares with a literal length; comments are not read.
 */
export function localLiteralLengths(file: string, text: string): Set<string> {
  const code = STYLE_FILE.test(file)
    ? text.replace(COMMENT, blank)
    : text.replace(SCRIPT_TOKEN, (token) =>
        token.startsWith('/') ? blank(token) : token,
      );
  const names = new Set<string>();
  forEachMatch(VARIABLE_DECLARATION, code, (match) => {
    if (new RegExp(LENGTH).test(match[2]) && !/var\(|\$/.test(match[2]))
      names.add(match[1]);
  });
  return names;
}

/**
 * Flag the literals of one font or transition value starting at `index`;
 * a transition value is recorded in `motionValues`, where motion-class does
 * not fire.
 */
function styleValue(
  property: string,
  value: string,
  index: number,
  { add, motionValues, literalLengths }: StyleScan,
): void {
  // An interpolation is the script's own value: no literal inside it fires.
  const scanned = value.replace(/\$\{[^}]*\}/g, blank);
  const bare = QUOTED.exec(value)?.[2] ?? value;
  const asWritten = value.replace(/\s+/g, ' ').trim();
  if (property.startsWith('transition')) {
    motionValues.push({ offset: index, text: value });
    if (NUMBER.test(bare)) {
      if (property === 'transitionDuration')
        add('motion-literal', index, value);
      return;
    }
    // In the shorthand the first time of each comma item is its duration;
    // a later one is a delay, which is not flagged.
    const item = commaItems(value);
    const timed = new Set<number>();
    forEachMatch(MOTION_TOKEN, scanned, (match) => {
      const time = /^[\d.]/.test(match[0]);
      if (time || match[0] === 'var(--motion)') {
        const n = item(match.index);
        if (property === 'transition' && timed.has(n)) return;
        timed.add(n);
        if (!time || parseFloat(match[0]) === 0) return;
      }
      add('motion-literal', index + match.index, match[0]);
    });
  } else if (property === 'font-family' || property === 'fontFamily') {
    if (literalFamily(value)) add('font-literal', index, asWritten);
  } else if (NUMBER.test(bare)) {
    add('font-literal', index, value);
  } else {
    const fluid: Region[] = [];
    forEachMatch(FLUID_TYPE, scanned, (match) =>
      fluid.push({ offset: match.index, text: match[0] }),
    );
    forEachMatch(SIZE_LITERAL, scanned, (match) => {
      if (!within(fluid, match.index))
        add('font-literal', index + match.index, match[0]);
    });
    // A literal behind a local name is flagged where the size reads it.
    forEachMatch(VARIABLE_READ, scanned, (match) => {
      if (literalLengths.has(match[1] ?? match[2]))
        add('font-literal', index + match.index, match[0]);
    });
    if (property === 'font' && shorthandFamily(value))
      add('font-literal', index, asWritten);
  }
}

function classRegions(style: boolean, text: string): Region[] {
  const regions: Region[] = [];
  forEachMatch(style ? APPLY : STRING_LITERAL, text, (match) =>
    regions.push({ offset: match.index, text: match[0] }),
  );
  return regions;
}

function positions(
  text: string,
): (index: number) => { line: number; column: number } {
  const starts = [0];
  for (let i = 0; i < text.length; i++)
    if (text[i] === '\n') starts.push(i + 1);
  return (index) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= index) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: index - starts[low] + 1 };
  };
}

export function scanFile(
  file: string,
  text: string,
  context: ScanContext,
): Finding[] {
  const style = STYLE_FILE.test(file);
  const position = positions(text);
  const findings: Finding[] = [];
  const add = (rule: RuleId, index: number, match: string): void => {
    findings.push({ file, ...position(index), rule, match });
  };

  forEachMatch(HEX, text, (match) =>
    add('color-literal', match.index, match[0]),
  );
  forEachMatch(COLOR_FUNCTION, text, (match) =>
    add('color-literal', match.index, match[0]),
  );
  if (style) {
    forEachMatch(CSS_COLOR_FUNCTION, text, (match) =>
      add('color-literal', match.index, match[0]),
    );
    forEachMatch(STYLE_DECLARATION, text, (match) => {
      forEachMatch(WORD, match[2].replace(URL_FUNCTION, ' '), (word) => {
        if (NAMED_COLORS.has(word[0].toLowerCase()))
          add('named-color', match.index, word[0]);
      });
    });
  } else {
    forEachMatch(SCRIPT_COLOR_PROPERTY, text, (match) => {
      if (NAMED_COLORS.has(match[1].toLowerCase()))
        add('named-color', match.index, match[1]);
    });
  }

  const regions = classRegions(style, text);
  const fontFaces: Region[] = [];
  forEachMatch(FONT_FACE, text, (match) =>
    fontFaces.push({ offset: match.index, text: match[0] }),
  );
  const scan: StyleScan = {
    add,
    motionValues: [],
    literalLengths: context.literalLengths,
  };
  const cssRegions = style ? [{ offset: 0, text }] : regions;
  for (const region of cssRegions) {
    // Blank comments in place, so offsets stay and a quoted declaration never fires.
    const css = region.text.replace(COMMENT, blank);
    forEachMatch(CSS_STYLE, css, (match) => {
      const index =
        region.offset + match.index + match[0].length - match[2].length;
      if (!within(fontFaces, index))
        styleValue(match[1], match[2], index, scan);
    });
  }
  if (!style)
    forEachMatch(
      SCRIPT_STYLE,
      text.replace(SCRIPT_TOKEN, (token) =>
        token.startsWith('/') ? blank(token) : token,
      ),
      (match) =>
        styleValue(
          match[1],
          match[2],
          match.index + match[0].length - match[2].length,
          scan,
        ),
    );

  for (const region of regions) {
    for (const [rule, pattern] of CLASS_RULES) {
      forEachMatch(pattern, region.text, (match) => {
        const index = region.offset + match.index;
        if (rule !== 'motion-class' || !within(scan.motionValues, index))
          add(rule, index, match[0]);
      });
    }
  }

  const declared = (name: string): boolean =>
    context.declaredNames.has(name) ||
    TAILWIND_VARIABLES.some((prefix) => name.startsWith(prefix)) ||
    context.allowVarPrefixes.some((prefix) => name.startsWith(prefix));
  forEachMatch(VAR_REFERENCE, text, (match) => {
    const name = match[1];
    if (context.designNames.has(name)) {
      if (match[2] === ',') add('var-fallback', match.index, match[0]);
    } else if (!declared(name)) {
      add('undeclared-var', match.index, match[0]);
    }
  });
  forEachMatch(TAILWIND_VAR, text, (match) => {
    if (!context.designNames.has(match[1]) && !declared(match[1])) {
      add('undeclared-var', match.index + 1, match[0].slice(1));
    }
  });
  forEachMatch(COLOR_SCHEME, text, (match) =>
    add('color-scheme', match.index, match[0]),
  );
  forEachMatch(Z_INDEX_CSS, text, (match) =>
    add('z-index', match.index, match[0]),
  );
  if (!style)
    forEachMatch(Z_INDEX_SCRIPT, text, (match) =>
      add('z-index', match.index, match[0]),
    );

  return findings.sort(
    (a, b) =>
      a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule),
  );
}
