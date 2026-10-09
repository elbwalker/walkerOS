import React, { type ReactNode } from 'react';

/** A colour class of the playground's code panels. */
export type TokenKind =
  | 'key'
  | 'str'
  | 'num'
  | 'punct'
  | 'tag'
  | 'kw'
  | 'fn'
  | 'dim'
  | 'entity'
  | 'property'
  | 'action'
  | 'context'
  | 'globals';

export interface Token {
  kind?: TokenKind;
  text: string;
}

/** One rendered line: its tokens and, for JSON output, its nesting depth. */
export interface Line {
  depth: number;
  tokens: Token[];
}

export type CodeKind = 'html' | 'js' | 'json';

const PATTERN: Record<CodeKind, RegExp> = {
  html: /("[^"]*")|(<\/?[a-z0-9]+|\/?>)|([a-z-]+)(?==)/g,
  js: /('[^']*')|\b(import|from|await|const)\b/g,
  json: /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/g,
};

/** walkerOS attributes in the tagging-demo colours. */
const ATTRIBUTE: Record<string, TokenKind> = {
  'data-elb': 'entity',
  'data-elbaction': 'action',
  'data-elbcontext': 'context',
  'data-elbglobals': 'globals',
};

function attributeKind(name: string): TokenKind {
  return ATTRIBUTE[name] ?? (name.startsWith('data-elb-') ? 'property' : 'key');
}

/** One line of source as coloured tokens. */
export function tokenize(line: string, kind: CodeKind): Token[] {
  const tokens: Token[] = [];
  const pattern = new RegExp(PATTERN[kind].source, 'g');
  let last = 0;
  for (let match = pattern.exec(line); match; match = pattern.exec(line)) {
    if (match.index > last)
      tokens.push({ text: line.slice(last, match.index) });
    let tokenKind: TokenKind;
    if (kind === 'html')
      tokenKind = match[1] ? 'str' : match[2] ? 'tag' : attributeKind(match[3]);
    else if (kind === 'js') tokenKind = match[1] ? 'str' : 'kw';
    else tokenKind = match[2] ? 'key' : match[1] ? 'str' : 'num';
    tokens.push({ kind: tokenKind, text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < line.length) tokens.push({ text: line.slice(last) });
  return tokens;
}

function primitive(value: unknown): Token {
  return {
    kind: typeof value === 'string' ? 'str' : 'num',
    text: JSON.stringify(value) ?? 'undefined',
  };
}

function keyTokens(key: string | undefined): Token[] {
  return key === undefined
    ? []
    : [
        { kind: 'key', text: JSON.stringify(key) },
        { kind: 'punct', text: ': ' },
      ];
}

/**
 * A value as pretty JSON lines with hanging indents. Short objects and arrays
 * of primitives stay on one line, so an event reads at a glance.
 */
export function jsonLines(
  value: unknown,
  depth = 0,
  key?: string,
  last = true,
  out: Line[] = [],
): Line[] {
  const comma = last ? '' : ',';
  const head = keyTokens(key);
  if (value === null || typeof value !== 'object') {
    out.push({
      depth,
      tokens: [...head, primitive(value), { kind: 'punct', text: comma }],
    });
    return out;
  }
  const isList = Array.isArray(value);
  const entries: Array<[string | undefined, unknown]> = isList
    ? value.map((item: unknown) => [undefined, item])
    : Object.entries(value);
  const [open, close] = isList ? ['[', ']'] : ['{', '}'];
  if (!entries.length) {
    out.push({
      depth,
      tokens: [...head, { kind: 'punct', text: open + close + comma }],
    });
    return out;
  }
  const flat = entries.every(
    ([, item]) => item === null || typeof item !== 'object',
  );
  if (flat && JSON.stringify(value).length < 34) {
    const inner: Token[] = [];
    entries.forEach(([itemKey, item], index) => {
      if (index) inner.push({ kind: 'punct', text: ', ' });
      inner.push(...keyTokens(itemKey), primitive(item));
    });
    const pad = isList ? '' : ' ';
    out.push({
      depth,
      tokens: [
        ...head,
        { kind: 'punct', text: open + pad },
        ...inner,
        { kind: 'punct', text: pad + close + comma },
      ],
    });
    return out;
  }
  out.push({ depth, tokens: [...head, { kind: 'punct', text: open }] });
  entries.forEach(([itemKey, item], index) =>
    jsonLines(item, depth + 1, itemKey, index === entries.length - 1, out),
  );
  out.push({ depth, tokens: [{ kind: 'punct', text: close + comma }] });
  return out;
}

/** Tokens as coloured spans. */
export function renderTokens(tokens: Token[]): ReactNode {
  return tokens.map((token, index) =>
    token.kind ? (
      <span key={index} className={`elb-pg-c-${token.kind}`}>
        {token.text}
      </span>
    ) : (
      token.text
    ),
  );
}

/** Output lines with hanging indents, as in the Event and Result panels. */
export function CodeLines({ lines }: { lines: Line[] }) {
  return (
    <>
      {lines.map((line, index) => (
        <div
          key={index}
          className="elb-pg-ln"
          style={{ paddingLeft: `${28 + line.depth * 14}px` }}
        >
          {renderTokens(line.tokens)}
        </div>
      ))}
    </>
  );
}
