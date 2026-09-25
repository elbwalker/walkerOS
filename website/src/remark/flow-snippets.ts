/**
 * Resolves `<FlowSlice feature="id" />` and `<FlowExample feature="id" />` at
 * build time, so a page ships only its own slices of
 * packages/cli/examples/flow-complete.json instead of the whole file.
 *
 * - FlowSlice with an object or array value becomes a `figure.flow-slice`
 *   holding a `CodeView` (label: the JSON Pointer) and a `figcaption` with the
 *   feature note and a guide link. A scalar value becomes a plain paragraph.
 * - FlowExample becomes a `figure.flow-example` holding a `StepExample` and a
 *   caption naming the example and its step.
 *
 * Both figures carry `data-export-lang`, one language per rendered code block,
 * for website/src/rehype/export-flow-snippets.ts: Shiki drops the language
 * before HTML, and the Markdown export is converted from that HTML.
 *
 * An unknown feature id, a pointer that does not resolve, a missing example, a
 * bad attribute or an inline usage fails the build with file and line.
 *
 * Registered under the docs `beforeDefaultRemarkPlugins`. The manifest is read
 * from cli source, so no cli build is needed. Cache caveat: webpack's
 * persistent cache does not know about flow-complete.json or the manifest, so
 * after editing either locally run `npm run clear` (or set
 * `DOCUSAURUS_NO_PERSISTENT_CACHE=1`) before `start` or `build`. CI builds
 * cold.
 */

import { readFileSync } from 'fs';
import {
  flowCompleteFeatures,
  isFeatureId,
  resolvePointer,
  type FeatureEntry,
} from '../../../packages/cli/src/examples/flow-complete.manifest';
import {
  findStepExample,
  guideChapterUrl,
} from '../components/snippets/flow-complete';

interface Options {
  /** Absolute path of flow-complete.json. */
  flowFile: string;
}

interface File {
  path?: string;
  /** The MDX source; used to check the quotes of `feature`. */
  value?: unknown;
}

type Component = 'FlowSlice' | 'FlowExample';

/** Past this many lines a slice gets a fixed, scrolling height. */
const TALL = 30;
const TALL_HEIGHT = '480px';

// Nodes this plugin emits. Local shapes rather than `mdast` and
// `mdast-util-mdx-jsx` types, which are transitive dependencies only.

interface TextNode {
  type: 'text' | 'inlineCode';
  value: string;
}

interface LinkNode {
  type: 'link';
  url: string;
  children: TextNode[];
}

type PhrasingNode = TextNode | LinkNode;

interface ParagraphNode {
  type: 'paragraph';
  children: PhrasingNode[];
}

type Estree =
  | { type: 'Literal'; value: string | number | boolean | null; raw: string }
  | { type: 'ArrayExpression'; elements: Estree[] }
  | { type: 'ObjectExpression'; properties: EstreeProperty[] };

interface EstreeProperty {
  type: 'Property';
  kind: 'init';
  key: { type: 'Literal'; value: string; raw: string };
  value: Estree;
  computed: false;
  method: false;
  shorthand: false;
}

interface ExpressionValue {
  type: 'mdxJsxAttributeValueExpression';
  value: string;
  data: {
    estree: {
      type: 'Program';
      sourceType: 'module';
      comments: [];
      body: [{ type: 'ExpressionStatement'; expression: Estree }];
    };
  };
}

interface JsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string | ExpressionValue;
}

interface JsxElement {
  type: 'mdxJsxFlowElement';
  name: string;
  attributes: JsxAttribute[];
  children: (JsxElement | PhrasingNode)[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * JSON with collapsed branches: beyond `depth`, and for nested step
 * `examples` (FlowExample renders those), a branch shows as `{ … }`.
 */
export function renderSlice(
  value: unknown,
  depth: number = Infinity,
  indent: string = '',
): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (depth === 0) return '[ … ]';
    const items = value.map(
      (item) => inner + renderSlice(item, depth - 1, inner),
    );
    return `[\n${items.join(',\n')}\n${indent}]`;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    if (depth === 0) return '{ … }';
    const items = entries.map(
      ([key, item]) =>
        `${inner}${JSON.stringify(key)}: ${
          key === 'examples' && isRecord(item)
            ? '{ … }'
            : renderSlice(item, depth - 1, inner)
        }`,
    );
    return `{\n${items.join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

/** A JSON value as an estree expression, for a JSX attribute expression. */
export function jsonToEstree(value: unknown): Estree {
  if (Array.isArray(value))
    return { type: 'ArrayExpression', elements: value.map(jsonToEstree) };
  if (isRecord(value))
    return {
      type: 'ObjectExpression',
      properties: Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => ({
          type: 'Property',
          kind: 'init',
          key: { type: 'Literal', value: key, raw: JSON.stringify(key) },
          value: jsonToEstree(item),
          computed: false,
          method: false,
          shorthand: false,
        })),
    };
  if (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return { type: 'Literal', value, raw: JSON.stringify(value) };
  return { type: 'Literal', value: null, raw: 'null' };
}

function attribute(name: string, value: string): JsxAttribute {
  return { type: 'mdxJsxAttribute', name, value };
}

function text(value: string): TextNode {
  return { type: 'text', value };
}

function inlineCode(value: string): TextNode {
  return { type: 'inlineCode', value };
}

function guideLink(entry: FeatureEntry): LinkNode {
  return {
    type: 'link',
    url: guideChapterUrl(entry.chapter),
    children: [text('Guide chapter '), inlineCode(entry.chapter)],
  };
}

function figcaption(children: PhrasingNode[]): JsxElement {
  return {
    type: 'mdxJsxFlowElement',
    name: 'figcaption',
    attributes: [],
    children,
  };
}

class SnippetError extends Error {}

/** The parsed props of one usage. */
interface Usage {
  component: Component;
  feature: string;
  depth: number;
}

function lineOf(node: Record<string, unknown>): number | undefined {
  const position = node.position;
  if (!isRecord(position) || !isRecord(position.start)) return undefined;
  const line = position.start.line;
  return typeof line === 'number' ? line : undefined;
}

/** The numeric literal of `depth={2}`, or undefined for anything else. */
function numericLiteral(value: Record<string, unknown>): number | undefined {
  if (!isRecord(value.data) || !isRecord(value.data.estree)) return undefined;
  const body = value.data.estree.body;
  if (!Array.isArray(body) || body.length !== 1) return undefined;
  const statement: unknown = body[0];
  if (!isRecord(statement) || statement.type !== 'ExpressionStatement')
    return undefined;
  const expression = statement.expression;
  if (!isRecord(expression) || expression.type !== 'Literal') return undefined;
  return typeof expression.value === 'number' ? expression.value : undefined;
}

/**
 * The source text of an attribute, or undefined when the tree carries no
 * offsets or the file no source.
 */
function rawAttribute(
  attr: Record<string, unknown>,
  source: string | undefined,
): string | undefined {
  const position = attr.position;
  if (source === undefined || !isRecord(position)) return undefined;
  const { start, end } = position;
  if (!isRecord(start) || !isRecord(end)) return undefined;
  if (typeof start.offset !== 'number' || typeof end.offset !== 'number')
    return undefined;
  return source.slice(start.offset, end.offset);
}

function parseUsage(
  component: Component,
  node: Record<string, unknown>,
  source: string | undefined,
): Usage {
  const usage: Usage = { component, feature: '', depth: Infinity };
  let hasFeature = false;
  const attributes = Array.isArray(node.attributes) ? node.attributes : [];
  const seen = new Set<unknown>();
  for (const attr of attributes) {
    if (!isRecord(attr) || attr.type !== 'mdxJsxAttribute')
      throw new SnippetError('spread attributes are not supported');
    const name = attr.name;
    if (seen.has(name))
      throw new SnippetError(`duplicate attribute "${String(name)}"`);
    seen.add(name);
    const value: unknown = attr.value;
    if (name === 'feature') {
      // Only the double-quoted form, the one apps/scripts/validate-docs.ts
      // matches: MDX parses 'x' and "x" alike, so check the source text.
      const raw = rawAttribute(attr, source);
      if (
        typeof value !== 'string' ||
        value === '' ||
        (raw !== undefined && !/^feature="[^"]+"$/.test(raw))
      )
        throw new SnippetError(
          'feature must be a double-quoted string literal, feature="<id>"',
        );
      usage.feature = value;
      hasFeature = true;
    } else if (name === 'depth' && component === 'FlowSlice') {
      const depth =
        isRecord(value) && value.type === 'mdxJsxAttributeValueExpression'
          ? numericLiteral(value)
          : undefined;
      if (depth === undefined || !Number.isInteger(depth) || depth < 0)
        throw new SnippetError(
          'depth must be a non-negative integer literal, depth={1}',
        );
      usage.depth = depth;
    } else {
      throw new SnippetError(`unknown attribute "${String(name)}"`);
    }
  }
  if (!hasFeature) throw new SnippetError('missing feature="<id>"');
  if (Array.isArray(node.children) && node.children.length > 0)
    throw new SnippetError('takes no children');
  return usage;
}

function sliceNode(
  entry: FeatureEntry,
  flow: unknown,
  depth: number,
): JsxElement | ParagraphNode {
  const value = resolvePointer(flow, entry.pointer);
  if (value === undefined)
    throw new SnippetError(`pointer ${entry.pointer} does not resolve`);

  if (!Array.isArray(value) && !isRecord(value))
    return {
      type: 'paragraph',
      children: [
        inlineCode(entry.pointer),
        text(': '),
        inlineCode(JSON.stringify(value)),
        text(`. ${entry.note} `),
        guideLink(entry),
      ],
    };

  const code = renderSlice(value, depth);
  const attributes = [
    attribute('label', entry.pointer),
    attribute('code', code),
    attribute('language', 'json'),
  ];
  if (code.split('\n').length > TALL)
    attributes.push(attribute('height', TALL_HEIGHT));

  return {
    type: 'mdxJsxFlowElement',
    name: 'figure',
    attributes: [
      attribute('className', 'flow-slice'),
      attribute('data-export-lang', 'json'),
    ],
    children: [
      {
        type: 'mdxJsxFlowElement',
        name: 'CodeView',
        attributes,
        children: [],
      },
      figcaption([text(`${entry.note} `), guideLink(entry)]),
    ],
  };
}

function exampleNode(entry: FeatureEntry, flow: unknown): JsxElement {
  const ref = entry.example;
  if (!ref) throw new SnippetError('the feature names no example');
  const found = findStepExample(flow, entry.pointer, ref);
  if (!found)
    throw new SnippetError(`example ${ref.step}.${ref.name} not found`);

  const title = typeof found.title === 'string' ? found.title : ref.name;
  const example: Record<string, unknown> = { title };
  if (typeof found.description === 'string')
    example.description = found.description;
  example.in = found.in;
  if (found.mapping !== undefined) example.mapping = found.mapping;
  example.out = found.out;

  // One language per CodeView, in StepExample's DOM order: Event, [Mapping],
  // Out. Out is a call list (javascript) when it is an array, as
  // website/src/components/snippets/StepExample.tsx formats it.
  const langs = [
    'json',
    ...(found.mapping !== undefined ? ['json'] : []),
    Array.isArray(found.out) ? 'javascript' : 'json',
  ];

  const expression: ExpressionValue = {
    type: 'mdxJsxAttributeValueExpression',
    value: JSON.stringify(example),
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        comments: [],
        body: [
          { type: 'ExpressionStatement', expression: jsonToEstree(example) },
        ],
      },
    },
  };

  return {
    type: 'mdxJsxFlowElement',
    name: 'figure',
    attributes: [
      attribute('className', 'flow-example'),
      attribute('data-export-lang', langs.join(',')),
    ],
    children: [
      {
        type: 'mdxJsxFlowElement',
        name: 'StepExample',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'example', value: expression },
        ],
        children: [],
      },
      figcaption([
        text(`${title}: example `),
        inlineCode(ref.name),
        text(' of step '),
        inlineCode(ref.step),
        text('. '),
        guideLink(entry),
      ]),
    ],
  };
}

function replacement(usage: Usage, flow: unknown): JsxElement | ParagraphNode {
  if (!isFeatureId(usage.feature))
    throw new SnippetError('unknown flow-complete feature id');
  const entry = flowCompleteFeatures.find((f) => f.id === usage.feature);
  if (!entry) throw new SnippetError('unknown flow-complete feature id');
  return usage.component === 'FlowSlice'
    ? sliceNode(entry, flow, usage.depth)
    : exampleNode(entry, flow);
}

function componentName(node: Record<string, unknown>): Component | undefined {
  const name = node.name;
  if (name === 'FlowSlice' || name === 'FlowExample') return name;
  return undefined;
}

function describe(node: Record<string, unknown>, component: string): string {
  const attributes = Array.isArray(node.attributes) ? node.attributes : [];
  for (const attr of attributes) {
    if (
      isRecord(attr) &&
      attr.name === 'feature' &&
      typeof attr.value === 'string'
    )
      return `<${component} feature="${attr.value}">`;
  }
  return `<${component}>`;
}

function walk(
  node: unknown,
  flow: unknown,
  file: File,
  source: string | undefined,
): void {
  if (!isRecord(node) || !Array.isArray(node.children)) return;
  const children: unknown[] = node.children;
  children.forEach((child, index) => {
    if (!isRecord(child)) return;
    const component = componentName(child);
    if (component !== undefined && child.type === 'mdxJsxTextElement')
      fail(
        file,
        child,
        describe(child, component),
        'must stand on its own line (inline usage)',
      );
    if (component !== undefined && child.type === 'mdxJsxFlowElement') {
      try {
        children[index] = replacement(
          parseUsage(component, child, source),
          flow,
        );
      } catch (error) {
        if (error instanceof SnippetError)
          fail(file, child, describe(child, component), error.message);
        throw error;
      }
      return;
    }
    walk(child, flow, file, source);
  });
}

function fail(
  file: File,
  node: Record<string, unknown>,
  usage: string,
  reason: string,
): never {
  const line = lineOf(node);
  throw new Error(
    `flow-snippets: ${file.path ?? '<unknown file>'}:${line ?? '?'}: ${usage}: ${reason}`,
  );
}

export default function flowSnippets(options: Options) {
  if (!options || typeof options.flowFile !== 'string')
    throw new Error(
      'flow-snippets: option flowFile (path to flow-complete.json) is required',
    );
  const flow: unknown = JSON.parse(readFileSync(options.flowFile, 'utf-8'));
  return function transformer(tree: unknown, file: File): void {
    walk(
      tree,
      flow,
      file,
      typeof file.value === 'string' ? file.value : undefined,
    );
  };
}
