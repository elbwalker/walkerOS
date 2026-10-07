import { tok, type CodeToken } from './tokens';

/** A value printed as JavaScript: a vendor call's argument or an event field. */
export type Literal =
  | string
  | number
  | boolean
  | null
  | Literal[]
  | { [key: string]: Literal };

/** A recorded vendor call: the function's name, then its arguments. */
export type CallRecord = readonly [string, ...Literal[]];

/** The parts of a mapping rule the demo names; data and settings bodies are elided. */
export interface RuleShape {
  readonly name?: string;
  readonly silent?: boolean;
  readonly data?: unknown;
  readonly settings?: object;
}

/** An event as `elb()` receives it. */
export interface ElbShape {
  readonly entity: string;
  readonly action: string;
  readonly data: { readonly [key: string]: Literal };
  readonly nested?: ReadonlyArray<{ readonly entity: string }>;
}

const ELIDED = '{…}';

function isRecord(value: Literal): value is { [key: string]: Literal } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `value` as a JavaScript literal: single-quoted strings, `{ key: value }` objects. */
export function literal(value: Literal): string {
  if (typeof value === 'string')
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof value !== 'object' || value === null) return String(value);
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  const entries = Object.entries(value);
  return entries.length === 0
    ? '{}'
    : `{ ${entries.map(([key, item]) => `${key}: ${literal(item)}`).join(', ')} }`;
}

/** A rule as the demo's mapping line: name and flags shown, bodies elided. */
export function formatRule(
  entity: string,
  action: string,
  rule: RuleShape,
): string {
  const fields: string[] = [];
  if (rule.name !== undefined) fields.push(`"name": "${rule.name}"`);
  if (rule.silent) fields.push('"silent": true');
  if (rule.data !== undefined) fields.push(`"data": ${ELIDED}`);
  if (rule.settings !== undefined) {
    const settings = Object.keys(rule.settings).map(
      (key) => `"${key}": ${ELIDED}`,
    );
    fields.push(`"settings": { ${settings.join(', ')} }`);
  }
  return `"${entity}": { "${action}": { ${fields.join(', ')} } }`;
}

/** A recorded call as JavaScript lines; the first object argument is expanded. */
export function formatCall(record: CallRecord): string[] {
  const [fn, ...args] = record;
  const at = args.findIndex(isRecord);
  const params = args[at];
  if (at < 0 || params === undefined || !isRecord(params))
    return [`${fn}(${args.map(literal).join(', ')})`];
  const fields = Object.entries(params);
  if (fn === 'amplitude.revenue') {
    if (fields.length === 0) return ['amplitude.revenue(new Revenue())'];
    return [
      'amplitude.revenue(new Revenue()',
      ...fields.map(
        ([key, value], index) =>
          `  .set${key.charAt(0).toUpperCase()}${key.slice(1)}(${literal(value)})${
            index === fields.length - 1 ? ')' : ''
          }`,
      ),
    ];
  }
  const before = args.slice(0, at).map(literal);
  const after = args.slice(at + 1).map(literal);
  return [
    `${fn}(${[...before, '{'].join(', ')}`,
    ...fields.map(([key, value]) => `  ${key}: ${literal(value)},`),
    `}${after.map((arg) => `, ${arg}`).join('')})`,
  ];
}

/** The `elb()` call that sends `event`; nested entities are abbreviated. */
export function formatElb(event: ElbShape): string {
  const name = literal(`${event.entity} ${event.action}`);
  const data = literal(event.data);
  if (!event.nested?.length) return `elb(${name}, ${data})`;
  const nested = event.nested.map(
    (entity) => `{ entity: ${literal(entity.entity)}, … }`,
  );
  return `elb({ name: ${name}, data: ${data}, nested: [${nested.join(', ')}] })`;
}

const TOKEN = /"[^"]*"|'[^']*'|\d+(?:\.\d+)?|[A-Za-z_]\w*|\s+|./g;
const CALLS =
  /^(?:gtag|fbq|elb|ttq|track|amplitude|revenue|Revenue|set[A-Z]\w*)$/;

/** One printed line as coloured tokens; strings equal to `highlight` are marked. */
export function tokenizeCode(line: string, highlight?: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  for (const match of line.matchAll(TOKEN)) {
    const t = match[0];
    const isKey = /^\s*:/.test(line.slice((match.index ?? 0) + t.length));
    if (t.startsWith('"') || t.startsWith("'")) {
      const marked = highlight !== undefined && t.slice(1, -1) === highlight;
      tokens.push(
        tok(t, isKey ? 'key' : 'value', marked ? 'entity' : undefined),
      );
    } else if (/^\d/.test(t) || t === 'true' || t === 'false') {
      tokens.push(tok(t, 'num'));
    } else if (CALLS.test(t)) {
      tokens.push(tok(t, 'fn'));
    } else if (/^[A-Za-z_]/.test(t)) {
      tokens.push(tok(t, isKey ? 'key' : 'text'));
    } else if (/^\s+$/.test(t)) {
      tokens.push(tok(t, 'text'));
    } else {
      tokens.push(tok(t, 'punct'));
    }
  }
  return tokens;
}
