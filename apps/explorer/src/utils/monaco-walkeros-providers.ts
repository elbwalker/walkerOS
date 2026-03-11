import type { languages, editor, IDisposable, Position } from 'monaco-editor';
import type { IntelliSenseContext } from '../types/intellisense';
import {
  getVariableCompletions,
  getDefinitionCompletions,
  getSecretCompletions,
  getPackageCompletions,
  getStepNameCompletions,
  getContractCompletions,
  getMappingPathCompletions,
  type CompletionEntry,
} from './monaco-walkeros-completions';
import { getJsonPathAtOffset } from './monaco-json-path';
import { detectMappingContext } from './mapping-context-detector';

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

        const entries: CompletionEntry[] = [];

        if (
          textBeforeCursor.includes('$var.') ||
          textBeforeCursor.endsWith('"$var')
        ) {
          entries.push(...getVariableCompletions(context.variables));
        } else if (
          textBeforeCursor.includes('$def.') ||
          textBeforeCursor.endsWith('"$def')
        ) {
          entries.push(...getDefinitionCompletions(context.definitions));
        } else if (
          textBeforeCursor.includes('$secret.') ||
          textBeforeCursor.endsWith('"$secret')
        ) {
          entries.push(...getSecretCompletions(context.secrets));
        } else if (
          textBeforeCursor.includes('$contract.') ||
          textBeforeCursor.endsWith('"$contract')
        ) {
          const match = textBeforeCursor.match(
            /\$contract\.([a-zA-Z0-9_.]*)?$/,
          );
          const pathStr = match?.[1] || '';
          const segments = pathStr ? pathStr.split('.').filter(Boolean) : [];
          if (pathStr && !pathStr.endsWith('.') && segments.length > 0) {
            segments.pop();
          }
          entries.push(
            ...getContractCompletions(context.contractRaw, segments),
          );
        } else if (isInsideKey(model, position, 'package')) {
          entries.push(
            ...getPackageCompletions(context.packages, context.platform),
          );
        } else if (
          isInsideKey(model, position, 'next') ||
          isInsideKey(model, position, 'before')
        ) {
          const key = isInsideKey(model, position, 'next') ? 'next' : 'before';
          entries.push(...getStepNameCompletions(context.stepNames, key));
        } else if (
          textBeforeCursor.endsWith('"$') ||
          textBeforeCursor.endsWith('"')
        ) {
          entries.push(...getVariableCompletions(context.variables));
          entries.push(...getDefinitionCompletions(context.definitions));
          entries.push(...getSecretCompletions(context.secrets));
          entries.push(...getContractCompletions(context.contractRaw, []));
        }

        // Mapping value path completions (data., globals., user., etc.)
        if (entries.length === 0 && context.contractRaw) {
          const fullText = model.getValue();
          const offset = model.getOffsetAt(position);
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
          /\$(?:var|def|secret|env|code|contract)[.:]?[\w.]*$/,
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

        // $var.name
        const varMatch = matchAtCursor(/\$var\.(\w+)/);
        if (varMatch && context.variables) {
          const name = varMatch[1];
          if (name in context.variables) {
            const value = context.variables[name];
            return {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: varMatch.index + 1,
                endLineNumber: position.lineNumber,
                endColumn: varMatch.index + varMatch[0].length + 1,
              },
              contents: [
                {
                  value: `**Variable:** \`$var.${name}\`\n\n**Value:** \`${JSON.stringify(value)}\`\n\n*Resolved at runtime via variable interpolation*`,
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

        // $def.name
        const defMatch = matchAtCursor(/\$def\.(\w+)/);
        if (defMatch && context.definitions) {
          const name = defMatch[1];
          if (name in context.definitions) {
            return {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: defMatch.index + 1,
                endLineNumber: position.lineNumber,
                endColumn: defMatch.index + defMatch[0].length + 1,
              },
              contents: [
                {
                  value: `**Definition:** \`$def.${name}\`\n\n*Injects reusable config fragment at runtime*`,
                },
              ],
            };
          }
          return {
            contents: [
              {
                value: `**Unknown definition** \`$def.${name}\`\n\nDefined: ${Object.keys(context.definitions).join(', ') || 'none'}`,
              },
            ],
          };
        }

        // $secret.name
        const secretMatch = matchAtCursor(/\$secret\.(\w+)/);
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

        // $contract.path
        const contractMatch = matchAtCursor(/\$contract\.[\w.]+/);
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

/**
 * Check if cursor is inside the value of a specific JSON key.
 */
function isInsideKey(
  model: editor.ITextModel,
  position: Position,
  key: string,
): boolean {
  const lineContent = model.getLineContent(position.lineNumber);
  const pattern = new RegExp(`"${key}"\\s*:\\s*"`);
  return pattern.test(lineContent);
}
