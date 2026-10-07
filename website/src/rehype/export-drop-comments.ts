/**
 * Drops HTML comments from a page before its Markdown export.
 *
 * React's server render separates adjacent text nodes with `<!-- -->`, so a
 * sentence built from props (`This {props.type} uses ...`) reaches the export
 * as `This <!-- -->destination<!-- --> uses ...`, and `hast-util-to-mdast`
 * keeps every comment as raw HTML in the Markdown. A rendered docs page holds
 * no comment a reader needs, so all of them go.
 *
 * Registered under the LLM export plugin's `content.beforeDefaultRehypePlugins`,
 * which run on the extracted hast before `rehype-remark`.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComment(node: unknown): boolean {
  return isRecord(node) && node.type === 'comment';
}

function drop(node: unknown): void {
  if (!isRecord(node) || !Array.isArray(node.children)) return;
  const children = node.children.filter((child) => !isComment(child));
  node.children = children;
  for (const child of children) drop(child);
}

export default function exportDropComments() {
  return function transformer(tree: unknown): void {
    drop(tree);
  };
}
