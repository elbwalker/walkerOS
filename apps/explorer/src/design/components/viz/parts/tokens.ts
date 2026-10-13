import type { CodeToken } from '../../codeTokens';

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
