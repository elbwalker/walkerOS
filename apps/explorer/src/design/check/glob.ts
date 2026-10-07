const escape = (text: string): string =>
  text.replace(/[.+^$()|[\]\\{}*?]/g, '\\$&');

/**
 * Translate a consumer glob (`**`, `*`, `?`, `{a,b}`) into an anchored RegExp
 * over `/`-separated relative paths; undefined for a malformed glob.
 */
export function globToRegExp(glob: string): RegExp | undefined {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      const slash = glob[i + 2] === '/';
      source += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else if (char === '{') {
      const end = glob.indexOf('}', i);
      if (end === -1) return undefined;
      source += `(?:${glob
        .slice(i + 1, end)
        .split(',')
        .map(escape)
        .join('|')})`;
      i = end;
    } else {
      source += escape(char);
    }
  }
  return new RegExp(`^${source}$`);
}
