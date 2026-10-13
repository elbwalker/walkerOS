/** The colour role of one run of code. */
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
