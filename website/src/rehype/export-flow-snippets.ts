/**
 * Gives the flow-complete snippets their code languages back in the Markdown
 * export.
 *
 * website/src/remark/flow-snippets.ts renders FlowSlice and FlowExample through
 * explorer's CodeView, whose Shiki HTML (`pre > code`) carries no language
 * class, so `hast-util-to-mdast` would write a fence without a language. The
 * docs plugin stamps each figure with `data-export-lang`, one language per
 * code block in document order. This plugin copies them onto the `code`
 * elements as `language-<lang>` classes, and wraps each CodeView header label
 * (the pointer, `Event`, `Out`) in `code` so it reads as an inline code
 * caption.
 *
 * Registered under the LLM export plugin's `content.beforeDefaultRehypePlugins`,
 * which run on the extracted hast before `rehype-remark`. It depends on
 * explorer's DOM: one `pre > code` per CodeView and `span.elb-explorer-label`
 * headers. A block count that does not match the language list throws.
 */

interface Element {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isElement(value: unknown): value is Element {
  return (
    isRecord(value) &&
    value.type === 'element' &&
    typeof value.tagName === 'string' &&
    isRecord(value.properties) &&
    Array.isArray(value.children)
  );
}

function hasClass(element: Element, name: string): boolean {
  const className = element.properties.className;
  return Array.isArray(className) && className.includes(name);
}

/** Every element below `node`, in document order. */
function descendants(node: Element): Element[] {
  const found: Element[] = [];
  for (const child of node.children) {
    if (!isElement(child)) continue;
    found.push(child, ...descendants(child));
  }
  return found;
}

function textContent(node: unknown): string {
  if (!isRecord(node)) return '';
  if (node.type === 'text' && typeof node.value === 'string') return node.value;
  return Array.isArray(node.children)
    ? node.children.map(textContent).join('')
    : '';
}

function labelOf(label: Element): Element | undefined {
  return label.children.length === 1 &&
    isElement(label.children[0]) &&
    label.children[0].tagName === 'code'
    ? label.children[0]
    : undefined;
}

function transformFigure(figure: Element, langs: string[]): void {
  const inside = descendants(figure);
  const labels = inside.filter(
    (element) =>
      element.tagName === 'span' && hasClass(element, 'elb-explorer-label'),
  );
  const codes = inside
    .filter((element) => element.tagName === 'pre')
    .flatMap((pre) =>
      pre.children.filter(
        (child): child is Element =>
          isElement(child) && child.tagName === 'code',
      ),
    );

  if (codes.length !== langs.length) {
    const name = labels.map(textContent).join(', ') || '(no label)';
    throw new Error(
      `export-flow-snippets: figure "${name}" has ${codes.length} code blocks, data-export-lang lists ${langs.length} (${langs.join(',')})`,
    );
  }

  codes.forEach((code, index) => {
    code.properties.className = [`language-${langs[index]}`];
  });

  for (const label of labels) {
    if (labelOf(label)) continue;
    label.children = [
      {
        type: 'element',
        tagName: 'code',
        properties: {},
        children: label.children,
      },
    ];
  }
}

function walk(node: unknown): void {
  if (!isRecord(node)) return;
  if (isElement(node) && node.tagName === 'figure') {
    const langs = node.properties.dataExportLang;
    if (typeof langs === 'string') {
      transformFigure(node, langs.split(','));
      return;
    }
  }
  const children = node.children;
  if (Array.isArray(children)) for (const child of children) walk(child);
}

export default function exportFlowSnippets() {
  return function transformer(tree: unknown): void {
    walk(tree);
  };
}
