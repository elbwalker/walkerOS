import type { languages, editor, IDisposable, Position } from 'monaco-editor';
import {
  REF_ENV,
  REF_CONTRACT,
  REF_FLOW,
  REF_STORE,
  REF_SECRET,
} from '@walkeros/core';
import type { IntelliSenseContext } from '../types/intellisense';
import {
  getVariableCompletions,
  getSecretCompletions,
  getStoreCompletions,
  getFlowCompletions,
  getEnvCompletions,
  getPackageCompletions,
  getStepNameCompletions,
  getContractCompletions,
  getMappingPathCompletions,
  type CompletionEntry,
} from './monaco-walkeros-completions';
import { getJsonPathAtOffset } from './monaco-json-path';
import { detectMappingContext } from './mapping-context-detector';
import {
  detectChainRefContext,
  detectKeyContext,
} from './monaco-chain-ref-detector';

/**
 * Build an inline global regex from any REF_* source. The shared REF_*
 * constants in @walkeros/core include `^`/`$` anchors for whole-value
 * matches (e.g. REF_STORE). For inline scanning (hover on a token within a
 * line) we need a non-anchored global variant with the same capture groups.
 *
 * For REF_CONTRACT the trailing path is `(.+)` which would greedily eat
 * characters when unanchored, so we bound it to `[\w.]+` for inline scans.
 */
function inlineGlobal(pattern: RegExp): RegExp {
  const src = pattern.source
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/\(\.\+\)\?$/, '([\\w.]+)?');
  return new RegExp(src, 'g');
}

/**
 * Extract the partial path typed after the `$contract.` prefix at the end
 * of the input. The prefix is derived from REF_CONTRACT.source so this
 * stays in lockstep with the shared reference syntax; the tail uses a
 * UI-friendly looser class because the user may be mid-typing (trailing
 * dot allowed).
 */
const CONTRACT_PREFIX = REF_CONTRACT.source
  .replace(/^\^/, '')
  .split(/\\\./, 1)[0]; // "\$contract"
const CONTRACT_PATH_AT_END = new RegExp(
  `${CONTRACT_PREFIX}\\.([a-zA-Z0-9_.]*)?$`,
);

function getContractPathAtEnd(text: string): RegExpMatchArray | null {
  return text.match(CONTRACT_PATH_AT_END);
}

/**
 * Returns true iff the cursor is inside a JSON string literal whose content
 * so far matches `^$contract(.path)?`. This guards the `$contract.` completion
 * branch — runtime only resolves contract refs when the string value starts
 * with `$contract.` at position 0 (see REF_CONTRACT), so inline cases like
 * `"prefix $contract.foo"` should NOT offer contract completions.
 */
export function isAtContractValueStart(
  model: editor.ITextModel,
  position: Position,
): boolean {
  const lineContent = model.getLineContent(position.lineNumber);
  const col = position.column - 1;
  const textBefore = lineContent.substring(0, col);
  const lastQuote = textBefore.lastIndexOf('"');
  if (lastQuote < 0) return false;
  const between = textBefore.substring(lastQuote + 1);
  return /^\$contract(\.[a-zA-Z0-9_.]*)?$/.test(between);
}

// Store context per model path for scoped completions
const contextRegistry = new Map<string, IntelliSenseContext>();
const disposables: IDisposable[] = [];
let registered = false;

/**
 * Update the IntelliSense context for a specific editor model.
 */
export function setIntelliSenseContext(
  modelPath: string,
  context: IntelliSenseContext,
): void {
  contextRegistry.set(modelPath, context);
}

/**
 * Remove context when editor unmounts.
 */
export function removeIntelliSenseContext(modelPath: string): void {
  contextRegistry.delete(modelPath);
}

/**
 * Register the walkerOS CompletionItemProvider and HoverProvider for JSON.
 * Call once on app initialization. Safe to call multiple times (idempotent).
 */
export function registerWalkerOSProviders(
  monaco: typeof import('monaco-editor'),
): void {
  if (registered) return;
  registered = true;

  // CompletionItemProvider
  disposables.push(
    monaco.languages.registerCompletionItemProvider('json', {
      triggerCharacters: ['"', '.', '$'],
      provideCompletionItems(
        model: editor.ITextModel,
        position: Position,
      ): languages.CompletionList {
        const modelPath = model.uri.toString();
        const context = contextRegistry.get(modelPath);
        if (!context) return { suggestions: [] };

        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        const offset = model.getOffsetAt(position);
        const fullText = model.getValue();
        const chainKey = detectChainRefContext(fullText, offset);

        const entries: CompletionEntry[] = [];

        if (
          textBeforeCursor.includes('$var.') ||
          textBeforeCursor.endsWith('"$var')
        ) {
          entries.push(...getVariableCompletions(context.variables));
        } else if (
          textBeforeCursor.includes('$secret.') ||
          textBeforeCursor.endsWith('"$secret')
        ) {
          entries.push(...getSecretCompletions(context.secrets));
        } else if (
          textBeforeCursor.includes('$store.') ||
          textBeforeCursor.endsWith('"$store')
        ) {
          entries.push(...getStoreCompletions(context.stores));
        } else if (
          textBeforeCursor.includes('$flow.') ||
          textBeforeCursor.endsWith('"$flow')
        ) {
          entries.push(...getFlowCompletions(context.flows));
        } else if (
          textBeforeCursor.includes('$env.') ||
          textBeforeCursor.endsWith('"$env')
        ) {
          entries.push(...getEnvCompletions(context.envNames));
        } else if (
          (textBeforeCursor.includes('$contract.') ||
            textBeforeCursor.endsWith('"$contract')) &&
          isAtContractValueStart(model, position)
        ) {
          // Extract the partial path typed so far after the "$contract."
          // prefix. This is a UI extraction helper (looser character class
          // than REF_CONTRACT because the user may be mid-typing), so it
          // captures any word-or-dot sequence at end of the cursor line.
          const match = getContractPathAtEnd(textBeforeCursor);
          const pathStr = match?.[1] || '';
          const segments = pathStr ? pathStr.split('.').filter(Boolean) : [];
          if (pathStr && !pathStr.endsWith('.') && segments.length > 0) {
            segments.pop();
          }
          entries.push(
            ...getContractCompletions(context.contractRaw, segments),
          );
        } else if (detectKeyContext(fullText, offset, 'package')) {
          entries.push(
            ...getPackageCompletions(context.packages, context.platform),
          );
        } else if (chainKey) {
          entries.push(...getStepNameCompletions(context.stepNames, chainKey));
        } else if (
          textBeforeCursor.endsWith('"$') ||
          textBeforeCursor.endsWith('"')
        ) {
          entries.push(...getVariableCompletions(context.variables));
          entries.push(...getSecretCompletions(context.secrets));
          entries.push(...getStoreCompletions(context.stores));
          entries.push(...getFlowCompletions(context.flows));
          entries.push(...getEnvCompletions(context.envNames));
          entries.push(...getContractCompletions(context.contractRaw, []));
        }

        // Mapping value path completions (data., globals., user., etc.)
        if (entries.length === 0 && context.contractRaw) {
          const jsonPath = getJsonPathAtOffset(fullText, offset);
          const mappingCtx = detectMappingContext(jsonPath);

          if (mappingCtx) {
            const valueMatch = textBeforeCursor.match(/"([a-z_]*)\.?$/);
            if (valueMatch) {
              const prefix = valueMatch[1];
              const mappingEntries = getMappingPathCompletions(
                context.contractRaw,
                mappingCtx.entity,
                mappingCtx.action,
                prefix,
              );
              if (mappingEntries.length > 0) {
                entries.push(...mappingEntries);
              }
            }
          }
        }

        // Calculate range that covers the full $ref.name token.
        // Monaco's getWordUntilPosition doesn't understand $ or . as word chars,
        // so we scan backwards to find the $ that starts the reference.
        const refStartMatch = textBeforeCursor.match(
          /\$(?:var|secret|env|code|contract|store|flow)[.:]?[\w.]*$/,
        );
        const mappingPathMatch = !refStartMatch
          ? textBeforeCursor.match(/[a-z_][\w.]*$/i)
          : null;
        const word = model.getWordUntilPosition(position);
        const startCol = refStartMatch
          ? position.column - refStartMatch[0].length
          : mappingPathMatch
            ? position.column - mappingPathMatch[0].length
            : word.startColumn;
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: startCol,
          endColumn: position.column,
        };

        return {
          suggestions: entries.map((entry) => ({
            label: entry.label,
            insertText: entry.insertText,
            detail: entry.detail,
            documentation: entry.documentation,
            kind: mapCompletionKind(monaco, entry.kind),
            sortText: entry.sortText,
            range,
          })),
        };
      },
    }),
  );

  // HoverProvider
  disposables.push(
    monaco.languages.registerHoverProvider('json', {
      provideHover(model, position) {
        const modelPath = model.uri.toString();
        const context = contextRegistry.get(modelPath);
        if (!context) return null;

        const lineContent = model.getLineContent(position.lineNumber);
        const col = position.column - 1; // 0-based index into line

        // Helper: find a reference match at cursor position
        function matchAtCursor(pattern: RegExp): RegExpExecArray | null {
          const regex = new RegExp(pattern.source, 'g');
          let m: RegExpExecArray | null;
          while ((m = regex.exec(lineContent)) !== null) {
            if (col >= m.index && col <= m.index + m[0].length) return m;
          }
          return null;
        }

        // $var.name(.deep.path)?
        const VAR_INLINE =
          /\$var\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;
        const varMatch = matchAtCursor(VAR_INLINE);
        if (varMatch && context.variables) {
          const name = varMatch[1];
          const fullToken = varMatch[0];
          if (name in context.variables) {
            const value = context.variables[name];
            return {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: varMatch.index + 1,
                endLineNumber: position.lineNumber,
                endColumn: varMatch.index + fullToken.length + 1,
              },
              contents: [
                {
                  value: `**Variable:** \`${fullToken}\`\n\n**Value:** \`${JSON.stringify(value)}\`\n\n*Resolved at runtime via variable interpolation*`,
                },
              ],
            };
          }
          return {
            contents: [
              {
                value: `**Unknown variable** \`$var.${name}\`\n\nDefined variables: ${Object.keys(context.variables).join(', ') || 'none'}`,
              },
            ],
          };
        }

        // $secret.name
        const secretMatch = matchAtCursor(inlineGlobal(REF_SECRET));
        if (secretMatch) {
          const name = secretMatch[1];
          if (context.secrets?.includes(name)) {
            return {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: secretMatch.index + 1,
                endLineNumber: position.lineNumber,
                endColumn: secretMatch.index + secretMatch[0].length + 1,
              },
              contents: [
                {
                  value: `**Secret:** \`$secret.${name}\`\n\n*Securely injected at runtime. Value not stored in config.*`,
                },
              ],
            };
          }
          return {
            contents: [
              {
                value: `**Unknown secret** \`$secret.${name}\`\n\nAvailable secrets: ${context.secrets?.join(', ') || 'none'}`,
              },
            ],
          };
        }

        // $store.name
        const storeMatch = matchAtCursor(inlineGlobal(REF_STORE));
        if (storeMatch) {
          const name = storeMatch[1];
          if (context.stores?.includes(name)) {
            return {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: storeMatch.index + 1,
                endLineNumber: position.lineNumber,
                endColumn: storeMatch.index + storeMatch[0].length + 1,
              },
              contents: [
                {
                  value: `**Store:** \`$store.${name}\`\n\n*Resolved to store instance at runtime.*`,
                },
              ],
            };
          }
          return {
            contents: [
              {
                value: `**Unknown store** \`$store.${name}\`\n\nAvailable: ${context.stores?.join(', ') || 'none'}`,
              },
            ],
          };
        }

        // $flow.name(.path)?
        const flowMatch = matchAtCursor(inlineGlobal(REF_FLOW));
        if (flowMatch && context.flows) {
          const flowName = flowMatch[1];
          const path = flowMatch[2];
          const known = context.flows.includes(flowName);
          const headline = known
            ? `**Flow reference:** \`$flow.${flowName}${path ? `.${path}` : ''}\``
            : `**Unknown flow** \`$flow.${flowName}\``;
          const body = known
            ? path
              ? `Resolves to \`flows.${flowName}.config.${path}\` at runtime.`
              : `Resolves to the full \`Flow.Config\` block of "${flowName}" at runtime.`
            : `Available: ${context.flows.join(', ') || 'none'}`;
          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: flowMatch.index + 1,
              endLineNumber: position.lineNumber,
              endColumn: flowMatch.index + flowMatch[0].length + 1,
            },
            contents: [{ value: `${headline}\n\n${body}` }],
          };
        }

        // $env.NAME
        const envMatch = matchAtCursor(inlineGlobal(REF_ENV));
        if (envMatch) {
          const name = envMatch[1];
          if (context.envNames && context.envNames.length > 0) {
            if (context.envNames.includes(name)) {
              return {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: envMatch.index + 1,
                  endLineNumber: position.lineNumber,
                  endColumn: envMatch.index + envMatch[0].length + 1,
                },
                contents: [
                  {
                    value: `**Env var:** \`$env.${name}\`\n\n*Resolved from process.env at runtime. Append \`:default\` for a literal fallback.*`,
                  },
                ],
              };
            }
            return {
              contents: [
                {
                  value: `**Unknown env var** \`$env.${name}\`\n\nKnown: ${context.envNames.join(', ') || 'none'}`,
                },
              ],
            };
          }
          // No inventory: generic hint
          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: envMatch.index + 1,
              endLineNumber: position.lineNumber,
              endColumn: envMatch.index + envMatch[0].length + 1,
            },
            contents: [
              {
                value: `**Env var:** \`$env.${name}\`\n\n*Resolved from process.env at runtime.*`,
              },
            ],
          };
        }

        // $contract.path
        const contractMatch = matchAtCursor(inlineGlobal(REF_CONTRACT));
        if (contractMatch && context.contractRaw) {
          const fullRef = contractMatch[0];
          const pathStr = fullRef.replace('$contract.', '');
          const segments = pathStr.split('.');

          const contractName = segments[0];
          const description =
            segments.length === 1
              ? `**Contract:** \`${fullRef}\`\n\nNamed contract entry "${contractName}".`
              : `**Contract reference:** \`${fullRef}\`\n\nResolves path \`${segments.slice(1).join('.')}\` in contract "${contractName}".`;

          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: contractMatch.index + 1,
              endLineNumber: position.lineNumber,
              endColumn: contractMatch.index + contractMatch[0].length + 1,
            },
            contents: [{ value: description }],
          };
        }

        return null;
      },
    }),
  );
}

/**
 * Dispose all registered providers. Call on app teardown.
 */
export function disposeWalkerOSProviders(): void {
  for (const d of disposables) d.dispose();
  disposables.length = 0;
  registered = false;
  contextRegistry.clear();
}

function mapCompletionKind(
  monaco: typeof import('monaco-editor'),
  kind: CompletionEntry['kind'],
): languages.CompletionItemKind {
  switch (kind) {
    case 'variable':
      return monaco.languages.CompletionItemKind.Variable;
    case 'reference':
      return monaco.languages.CompletionItemKind.Reference;
    case 'secret':
      return monaco.languages.CompletionItemKind.Constant;
    case 'module':
      return monaco.languages.CompletionItemKind.Module;
    case 'property':
      return monaco.languages.CompletionItemKind.Property;
    default:
      return monaco.languages.CompletionItemKind.Text;
  }
}
