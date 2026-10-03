/**
 * Captions the flow-complete snippets in the Markdown export and checks their
 * code blocks name a language.
 *
 * website/src/remark/flow-snippets.ts renders FlowSlice and FlowExample as
 * `figure.flow-slice` and `figure.flow-example` holding explorer CodeViews.
 * This plugin wraps each CodeView header label (the pointer, `Event`, `Out`)
 * in `code`, so it reads as an inline code caption. The fence languages come
 * from explorer's CodeStatic (`language-<lang>` on `pre > code`); a snippet
 * code block without one throws, since explorer's DOM no longer matches and
 * the export would ship fences without a language.
 *
 * Registered under the LLM export plugin's `content.beforeDefaultRehypePlugins`,
 * which run on the extracted hast before `rehype-remark`. It depends on
 * explorer's DOM: `pre > code` per CodeView and `span.elb-explorer-label`
 * headers.
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

/** Whether a `code` element names its language the way rehype-remark reads it. */
function hasLanguage(code: Element): boolean {
  const className = code.properties.className;
  return (
    Array.isArray(className) &&
    className.some(
      (name) => typeof name === 'string' && /^language-./.test(name),
    )
  );
}

function transformFigure(figure: Element): void {
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

  const unnamed = codes.filter((code) => !hasLanguage(code)).length;
  if (codes.length === 0 || unnamed > 0) {
    const name = labels.map(textContent).join(', ') || '(no label)';
    throw new Error(
      `export-flow-snippets: figure "${name}" has ${codes.length} code blocks, ${unnamed} of them without a language-<lang> class`,
    );
  }

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
  if (
    isElement(node) &&
    node.tagName === 'figure' &&
    (hasClass(node, 'flow-slice') || hasClass(node, 'flow-example'))
  ) {
    transformFigure(node);
    return;
  }
  const children = node.children;
  if (Array.isArray(children)) for (const child of children) walk(child);
}

export default function exportFlowSnippets() {
  return function transformer(tree: unknown): void {
    walk(tree);
  };
}
