/** The colour role of one run of code in a demo. */
export type TokenKind =
  | 'tag'
  | 'attr'
  | 'punct'
  | 'str'
  | 'text'
  | 'kw'
  | 'num'
  | 'fn'
  | 'key'
  | 'value';

/** The five parts of a walkerOS event; each has its own colour. */
export type EventPart =
  | 'entity'
  | 'action'
  | 'property'
  | 'context'
  | 'globals';

/** One run of code text; `mark` tints it in an event part's colour. */
export interface CodeToken {
  readonly t: string;
  readonly kind: TokenKind;
  readonly mark?: EventPart;
}

export function tok(t: string, kind: TokenKind, mark?: EventPart): CodeToken {
  return mark ? { t, kind, mark } : { t, kind };
}

export function lineText(tokens: readonly CodeToken[]): string {
  return tokens.map((token) => token.t).join('');
}

export function typedLength(tokens: readonly CodeToken[]): number {
  return tokens.reduce((length, token) => length + token.t.length, 0);
}

/** The first `n` characters of `tokens`, still as tokens: a typing effect. */
export function truncate(tokens: readonly CodeToken[], n: number): CodeToken[] {
  const out: CodeToken[] = [];
  let left = n;
  for (const token of tokens) {
    if (left <= 0) break;
    const t = token.t.slice(0, left);
    out.push({ ...token, t });
    left -= t.length;
  }
  return out;
}
