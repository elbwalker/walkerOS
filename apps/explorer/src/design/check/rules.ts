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
  'radius-class',
  'var-fallback',
  'undeclared-var',
  'color-scheme',
  'z-index',
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
  [
    'text-size-class',
    new RegExp(`${START}text-(?:xs|sm|base|lg|xl|[2-9]xl)${END}`, 'g'),
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
const STRING_LITERAL =
  /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;
const APPLY = /@apply\s+[^;}]+/g;
interface Region {
  readonly offset: number;
  readonly text: string;
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

  for (const region of classRegions(style, text)) {
    for (const [rule, pattern] of CLASS_RULES) {
      forEachMatch(pattern, region.text, (match) =>
        add(rule, region.offset + match.index, match[0]),
      );
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
