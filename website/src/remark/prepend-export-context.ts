/**
 * Prepends one orientation line to every generated Markdown export.
 *
 * A single page read on its own says nothing about what walkerOS is or where
 * the rest of the documentation lives, and the exports are built to be read
 * that way: fetched directly, or opened by an agent that followed a link into
 * a niche page. One blockquote at the top points at the canonical index.
 *
 * Registered under the LLM export plugin's `content.remarkPlugins`, which run
 * on the mdast of the per-page exports only. llms.txt is assembled from route
 * metadata on a separate path and never reaches this transform.
 */

interface Options {
  /** Fully qualified URL of the canonical index. */
  indexUrl: string;
}

const NOTE_PREFIX =
  'Part of the walkerOS documentation. Project overview and full index: ';

/**
 * The index goes in as a link rather than as text. remark-gfm reads a bare URL
 * in a text node as an autolink literal, so remark-stringify escapes it back
 * out as `https\://www\.walkeros.io`; a link node stringifies to the plain
 * `<https://www.walkeros.io/llms.txt>` autolink instead.
 */
function noteNodes(indexUrl: string): unknown[] {
  return [
    { type: 'text', value: NOTE_PREFIX },
    {
      type: 'link',
      url: indexUrl,
      children: [{ type: 'text', value: indexUrl }],
    },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function firstChild(node: unknown, type: string): unknown {
  if (!isRecord(node) || node.type !== type) return undefined;
  const children = node.children;
  return Array.isArray(children) ? children[0] : undefined;
}

/** Recognises a note a previous run wrote, so a second run is a no-op. */
function hasNote(node: unknown): boolean {
  const paragraph = firstChild(node, 'blockquote');
  const text = firstChild(paragraph, 'paragraph');
  return isRecord(text) && text.type === 'text' && text.value === NOTE_PREFIX;
}

export default function prependExportContext(options: Options) {
  return function transformer(tree: unknown): void {
    if (!isRecord(tree)) return;

    const children = tree.children;
    if (!Array.isArray(children)) return;
    if (hasNote(children[0])) return;

    children.unshift({
      type: 'blockquote',
      children: [{ type: 'paragraph', children: noteNodes(options.indexUrl) }],
    });
  };
}
