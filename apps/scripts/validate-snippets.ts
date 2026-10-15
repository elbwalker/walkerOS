#!/usr/bin/env npx tsx
/**
 * Validates that every `<CodeSnippet code={`...`} />` in the website docs
 * renders Prettier-formatted code.
 * Usage: npx tsx apps/scripts/validate-snippets.ts [--write]
 *
 * `CodeSnippet` shows its code exactly as authored, so an unindented snippet
 * reaches the reader unindented. The check reads the string the component
 * actually receives: the page is parsed the way Docusaurus parses it, and the
 * site's own indentation-restoring remark plugin runs first.
 *
 * A snippet Prettier can parse must match Prettier's output; `--write` replaces
 * each unformatted template literal in the source with the formatted code.
 * Excerpts Prettier cannot parse or would misread (`settings: {...}`, `{ ... }`
 * placeholders, a lone opening tag) and languages it has no parser for (bash,
 * sql) are checked for indentation only, and fixed by hand.
 */

import { escapeMarkdownHeadingIds } from '@docusaurus/utils';
import type { TemplateLiteral } from 'estree';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import type { Nodes } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { join, relative } from 'path';
import * as prettier from 'prettier';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import ts from 'typescript';
import { unified } from 'unified';
import restoreExpressionIndent from '../../website/src/remark/restore-expression-indent';

interface Issue {
  file: string;
  line: number;
  message: string;
}

interface Snippet {
  // Source line of the `code={`` attribute.
  line: number;
  language: string;
  literal: TemplateLiteral;
}

const ROOT = join(__dirname, '..', '..');
const DOCS_GLOB = 'website/docs/**/*.{md,mdx}';
const WRITE = process.argv.includes('--write');

// `CodeSnippet` defaults to javascript when no language is given.
const DEFAULT_LANGUAGE = 'javascript';

// The file extension tells Prettier which parser and dialect to use (tsx
// enables JSX for the typescript parser).
const EXTENSIONS: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  tsx: 'tsx',
  json: 'json',
  html: 'html',
  yaml: 'yaml',
};

function isJsxElement(
  node: Nodes,
): node is MdxJsxFlowElement | MdxJsxTextElement {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

function stringAttribute(
  element: MdxJsxFlowElement | MdxJsxTextElement,
  name: string,
): string | undefined {
  for (const attribute of element.attributes) {
    if (attribute.type !== 'mdxJsxAttribute' || attribute.name !== name) {
      continue;
    }
    return typeof attribute.value === 'string' ? attribute.value : undefined;
  }
  return undefined;
}

function codeLiteral(
  element: MdxJsxFlowElement | MdxJsxTextElement,
): TemplateLiteral | undefined {
  for (const attribute of element.attributes) {
    if (attribute.type !== 'mdxJsxAttribute' || attribute.name !== 'code') {
      continue;
    }
    const value = attribute.value;
    if (!value || typeof value === 'string') return undefined;
    const statement = value.data?.estree?.body[0];
    if (statement?.type !== 'ExpressionStatement') return undefined;
    const expression = statement.expression;
    if (expression.type !== 'TemplateLiteral') return undefined;
    // An interpolated template is assembled at runtime, not authored as text.
    if (expression.expressions.length > 0) return undefined;
    return expression;
  }
  return undefined;
}

function collectSnippets(node: Nodes, snippets: Snippet[]): void {
  if (isJsxElement(node) && node.name === 'CodeSnippet') {
    const literal = codeLiteral(node);
    if (literal?.loc) {
      snippets.push({
        line: literal.loc.start.line,
        language: stringAttribute(node, 'language') ?? DEFAULT_LANGUAGE,
        literal,
      });
    }
  }
  if ('children' in node) {
    for (const child of node.children) collectSnippets(child, snippets);
  }
}

function parseSnippets(source: string): Snippet[] {
  // Docusaurus escapes `{#id}` heading anchors before MDX parses the page. The
  // escape only adds characters on heading lines, so line numbers and the
  // columns on snippet lines stay valid for the original source.
  const content = escapeMarkdownHeadingIds(source);
  const tree = unified().use(remarkParse).use(remarkMdx).parse(content);
  restoreExpressionIndent()(tree, { value: content });
  const snippets: Snippet[] = [];
  collectSnippets(tree, snippets);
  return snippets;
}

// Offsets of the literal's backticks in the original source, or undefined when
// the source text there is not the code the page renders.
function sourceRange(
  lineOffsets: number[],
  source: string,
  literal: TemplateLiteral,
): { start: number; end: number } | undefined {
  const loc = literal.loc;
  if (!loc) return undefined;
  const start = lineOffsets[loc.start.line - 1] + loc.start.column;
  const end = lineOffsets[loc.end.line - 1] + loc.end.column;
  if (source[start] !== '`' || source[end - 1] !== '`') return undefined;
  if (source.slice(start + 1, end - 1) !== literal.quasis[0].value.raw) {
    return undefined;
  }
  return { start, end };
}

function lineOffsetsOf(source: string): number[] {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') offsets.push(index + 1);
  }
  return offsets;
}

function escapeTemplate(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

const SCRIPT_KINDS: Record<string, ts.ScriptKind> = {
  js: ts.ScriptKind.JSX,
  ts: ts.ScriptKind.TS,
  tsx: ts.ScriptKind.TSX,
};

function hasLabel(code: string, scriptKind: ts.ScriptKind): boolean {
  const file = ts.createSourceFile(
    'snippet',
    code,
    ts.ScriptTarget.Latest,
    false,
    scriptKind,
  );
  const visit = (node: ts.Node): boolean =>
    ts.isLabeledStatement(node) || (ts.forEachChild(node, visit) ?? false);
  return visit(file);
}

function count(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/**
 * Whether Prettier read an excerpt as different code. Object excerpts such as
 * `data: { map: { platform: 'source.platform' } }` parse as labeled blocks, and
 * formatting them as statements adds semicolons. An HTML excerpt showing an
 * opening tag gets the closing tag added.
 */
function misread(code: string, formatted: string, extension: string): boolean {
  const scriptKind = SCRIPT_KINDS[extension];
  if (scriptKind !== undefined) return hasLabel(code, scriptKind);
  if (extension === 'html')
    return count(formatted, /<\//g) > count(code, /<\//g);
  return false;
}

// The formatted code, or undefined when Prettier has no parser for the language
// or the snippet is an excerpt it cannot parse, or would read as other code.
async function formatSnippet(
  code: string,
  language: string,
): Promise<string | undefined> {
  const extension = EXTENSIONS[language];
  if (!extension) return undefined;
  const filepath = join(ROOT, 'website', 'docs', `snippet.${extension}`);
  const config = await prettier.resolveConfig(filepath);
  let formatted: string;
  try {
    // Prettier ends a file with a newline; a snippet ends with its last line.
    formatted = (await prettier.format(code, { ...config, filepath })).replace(
      /\n$/,
      '',
    );
  } catch {
    return undefined;
  }
  return misread(code, formatted, extension) ? undefined : formatted;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * The first snippet line (1-based) that sits at or left of the line opening a
 * bracket above it, the shape a flattened snippet has. A closer directly after
 * the opener (`{}` split over two lines) is fine.
 */
function flattenedLine(code: string): number | undefined {
  const lines = code.split('\n');
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!/[{([]$/.test(lines[index].trimEnd())) continue;
    const offset = lines
      .slice(index + 1)
      .findIndex((line) => line.trim() !== '');
    if (offset === -1) return undefined;
    const next = index + 1 + offset;
    if (/^[})\]]/.test(lines[next].trimStart())) continue;
    if (indentOf(lines[next]) <= indentOf(lines[index])) return next + 1;
  }
  return undefined;
}

async function main(): Promise<void> {
  const files = await glob(DOCS_GLOB, {
    cwd: ROOT,
    ignore: ['**/node_modules/**'],
    absolute: true,
  });

  const issues: Issue[] = [];
  let formattedCount = 0;
  let indentOnlyCount = 0;
  let rewritten = 0;

  for (const file of files.sort()) {
    const rel = relative(ROOT, file);
    const source = readFileSync(file, 'utf-8');
    const lineOffsets = lineOffsetsOf(source);
    const edits: { start: number; end: number; text: string }[] = [];

    for (const snippet of parseSnippets(source)) {
      const code = snippet.literal.quasis[0].value.cooked ?? '';
      const formatted = await formatSnippet(code, snippet.language);

      if (formatted === undefined) {
        indentOnlyCount += 1;
        const line = flattenedLine(code);
        if (line !== undefined) {
          issues.push({
            file: rel,
            line: snippet.line + line - 1,
            message:
              'not indented under the line that opens it (Prettier cannot parse this snippet; fix it by hand)',
          });
        }
        continue;
      }

      formattedCount += 1;
      if (formatted === code) continue;

      const range = WRITE
        ? sourceRange(lineOffsets, source, snippet.literal)
        : undefined;
      if (range) {
        edits.push({ ...range, text: `\`${escapeTemplate(formatted)}\`` });
        continue;
      }
      issues.push({
        file: rel,
        line: snippet.line,
        message: WRITE
          ? 'not formatted, and the source does not match the rendered code; fix it by hand'
          : 'not formatted (npm run validate:snippets -- --write)',
      });
    }

    if (edits.length === 0) continue;
    let output = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    }
    writeFileSync(file, output);
    rewritten += edits.length;
  }

  if (WRITE) console.log(`Formatted ${rewritten} snippets.\n`);

  const summary = `${formattedCount} checked against Prettier, ${indentOnlyCount} for indentation only`;
  if (issues.length === 0) {
    console.log(`✅ All code snippets are formatted (${summary}).\n`);
    process.exit(0);
  }

  console.log(`Code snippets: ${summary}.\n`);

  console.log(`❌ Found ${issues.length} snippet issues:\n`);
  for (const issue of issues) {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    ${issue.message}\n`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
