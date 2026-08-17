/**
 * Restores the leading indentation MDX removes from multi-line JSX attribute
 * expressions.
 *
 * `micromark-factory-mdx-expression` eats up to two leading spaces (or one tab)
 * from every continuation line of an expression, because `mdast-util-mdx-jsx`
 * adds that same two-space carrier indent back when it serializes an
 * expression. Docs write snippets as `<CodeSnippet code={`...`} />` without a
 * carrier indent, so two real spaces per line are gone before any component,
 * renderer or Markdown exporter sees the string.
 *
 * This plugin puts back exactly what was removed: for each line of a multi-line
 * template literal it compares the raw source line against the parsed line and
 * re-applies the whitespace difference. It only ever prepends whitespace, and
 * it leaves an expression untouched whenever source and parse do not line up.
 */

interface Position {
  line: number;
}

interface SourceLocation {
  start: Position;
  end: Position;
}

interface TemplateElement {
  type: string;
  value: { raw: string; cooked?: string | null };
}

interface TemplateLiteral {
  type: string;
  quasis: TemplateElement[];
  expressions: unknown[];
  loc?: SourceLocation | null;
}

interface AttributeValueExpression {
  type: string;
  value: string;
  data?: {
    estree?: {
      body?: { type: string; expression?: unknown }[];
    } | null;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asAttributeValueExpression(
  value: unknown,
): AttributeValueExpression | undefined {
  if (!isRecord(value)) return undefined;
  if (value.type !== 'mdxJsxAttributeValueExpression') return undefined;
  if (typeof value.value !== 'string') return undefined;
  // Narrowing to the real `MdxJsxAttributeValueExpression` would mean promoting
  // `mdast-util-mdx-jsx` from a transitive dependency to a direct one; the
  // checks above establish the shape this file relies on.
  return value as unknown as AttributeValueExpression;
}

/**
 * The lone template literal of an attribute expression, or undefined for
 * anything else (objects, JSX fragments, interpolated templates, one-liners).
 */
function soleTemplateLiteral(
  attributeValue: AttributeValueExpression,
): TemplateLiteral | undefined {
  const body = attributeValue.data?.estree?.body;
  if (!Array.isArray(body) || body.length !== 1) return undefined;
  const statement = body[0];
  if (!isRecord(statement) || statement.type !== 'ExpressionStatement') {
    return undefined;
  }
  const expression = statement.expression;
  if (!isRecord(expression) || expression.type !== 'TemplateLiteral') {
    return undefined;
  }
  // Same reasoning as above: the estree `TemplateLiteral` type would mean a
  // direct `@types/estree` dependency, and the `type` check above is the only
  // discriminator this file needs.
  const literal = expression as unknown as TemplateLiteral;
  if (literal.expressions.length !== 0) return undefined;
  if (literal.quasis.length !== 1) return undefined;
  const loc = literal.loc;
  if (!loc || loc.end.line <= loc.start.line) return undefined;
  return literal;
}

function leadingWhitespace(line: string): string {
  const match = /^[ \t]*/.exec(line);
  return match ? match[0] : '';
}

/**
 * The whitespace MDX removed from `parsedLine`, or undefined when the two lines
 * do not correspond (in which case the expression is left alone).
 */
function strippedPrefix(
  sourceLine: string,
  parsedLine: string,
): string | undefined {
  const sourceIndent = leadingWhitespace(sourceLine);
  const parsedIndent = leadingWhitespace(parsedLine);
  if (!sourceIndent.endsWith(parsedIndent)) return undefined;
  const prefix = sourceIndent.slice(
    0,
    sourceIndent.length - parsedIndent.length,
  );
  if (!sourceLine.slice(prefix.length).startsWith(parsedLine)) return undefined;
  return prefix;
}

function reindent(text: string, prefixes: string[]): string {
  const lines = text.split('\n');
  return lines
    .map((line, index) => (index === 0 ? line : prefixes[index] + line))
    .join('\n');
}

function restoreAttribute(
  attributeValue: AttributeValueExpression,
  sourceLines: string[],
): void {
  const literal = soleTemplateLiteral(attributeValue);
  if (!literal) return;

  const quasi = literal.quasis[0];
  const raw = quasi.value.raw;
  const cooked = quasi.value.cooked;
  const rawLines = raw.split('\n');
  if (rawLines.length < 2) return;

  // An escape that expands to a line break would desynchronise cooked from raw.
  if (
    typeof cooked === 'string' &&
    cooked.split('\n').length !== rawLines.length
  ) {
    return;
  }
  // `value` is the serialized expression: the template literal plus backticks.
  const valueLines = attributeValue.value.split('\n');
  if (valueLines.length !== rawLines.length) return;

  const startLine = literal.loc?.start.line;
  if (typeof startLine !== 'number') return;

  const prefixes: string[] = [''];
  for (let index = 1; index < rawLines.length; index += 1) {
    const sourceLine = sourceLines[startLine - 1 + index];
    if (sourceLine === undefined) return;
    const prefix = strippedPrefix(sourceLine, rawLines[index]);
    if (prefix === undefined) return;
    prefixes.push(prefix);
  }
  if (prefixes.every((prefix) => prefix === '')) return;

  quasi.value.raw = reindent(raw, prefixes);
  if (typeof cooked === 'string') {
    quasi.value.cooked = reindent(cooked, prefixes);
  }
  attributeValue.value = reindent(attributeValue.value, prefixes);
}

// Markdown containers strip their own indentation from every line before the
// expression tokenizer runs, so the raw source line carries a prefix the parsed
// line never had. Subtracting one from the other would fold the container
// indent into the snippet: a list item's closing brace ends up indented past
// the opener it should align with. The container prefix is not recoverable from
// the expression's `loc`, so containers keep the upstream flattening instead.
const CONTAINER_TYPES = new Set([
  'listItem',
  'blockquote',
  'footnoteDefinition',
]);

function walk(node: unknown, sourceLines: string[]): void {
  if (!isRecord(node)) return;
  if (typeof node.type === 'string' && CONTAINER_TYPES.has(node.type)) return;

  const attributes = node.attributes;
  if (Array.isArray(attributes)) {
    for (const attribute of attributes) {
      if (!isRecord(attribute)) continue;
      const attributeValue = asAttributeValueExpression(attribute.value);
      if (attributeValue) restoreAttribute(attributeValue, sourceLines);
    }
  }

  const children = node.children;
  if (Array.isArray(children)) {
    for (const child of children) walk(child, sourceLines);
  }
}

export default function restoreExpressionIndent() {
  return function transformer(tree: unknown, file: { value?: unknown }): void {
    if (typeof file.value !== 'string') return;
    walk(tree, file.value.split('\n'));
  };
}
