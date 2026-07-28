/**
 * Normalizes the Markdown link targets emitted by the LLM export.
 *
 * The export appends `.md` to a route path. Docusaurus route paths for index
 * pages end in a slash, so `/docs/mapping/` becomes `/docs/mapping/.md`, which
 * no emitted file matches: the page is written to `/docs/mapping.md`. This
 * plugin rewrites `<path>/.md` to `<path>.md` on every link target in the
 * generated Markdown.
 *
 * Runs on the mdast of the LLM export pipeline, after the export's own link
 * rewriting and before stringification.
 */

const TRAILING_SLASH_MD = /\/\.md(?=$|[?#])/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalize(url: string): string {
  // Leave `/.md` itself alone: only a real path segment can carry the slash.
  if (url.length <= '/.md'.length) return url;
  return url.replace(TRAILING_SLASH_MD, '.md');
}

function walk(node: unknown): void {
  if (!isRecord(node)) return;

  if (
    (node.type === 'link' || node.type === 'definition') &&
    typeof node.url === 'string'
  ) {
    node.url = normalize(node.url);
  }

  const children = node.children;
  if (Array.isArray(children)) {
    for (const child of children) walk(child);
  }
}

export default function normalizeExportLinks() {
  return function transformer(tree: unknown): void {
    walk(tree);
  };
}
