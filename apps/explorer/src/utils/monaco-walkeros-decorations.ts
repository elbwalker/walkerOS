import type { editor } from 'monaco-editor';

export type ReferenceType =
  | 'variable'
  | 'definition'
  | 'secret'
  | 'env'
  | 'code';

export interface WalkerOSReference {
  type: ReferenceType;
  name: string;
  startIndex: number;
  endIndex: number;
}

export const REFERENCE_PATTERNS: Array<{
  type: ReferenceType;
  regex: RegExp;
  className: string;
}> = [
  { type: 'variable', regex: /\$var\.(\w*)/g, className: 'elb-ref-variable' },
  {
    type: 'definition',
    regex: /\$def\.(\w*)/g,
    className: 'elb-ref-definition',
  },
  { type: 'secret', regex: /\$secret\.(\w*)/g, className: 'elb-ref-secret' },
  { type: 'env', regex: /\$env\.(\w*)/g, className: 'elb-ref-env' },
  { type: 'code', regex: /\$code:/g, className: 'elb-ref-code' },
];

/**
 * Find all walkerOS reference patterns in text.
 * Used for both decorations and validation.
 */
export function findWalkerOSReferences(text: string): WalkerOSReference[] {
  const references: WalkerOSReference[] = [];

  for (const pattern of REFERENCE_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      references.push({
        type: pattern.type,
        name: pattern.type === 'code' ? '' : match[1] || '',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return references;
}

/**
 * Apply walkerOS reference decorations to a Monaco editor.
 * Returns a cleanup function.
 */
export function applyWalkerOSDecorations(
  editorInstance: editor.IStandaloneCodeEditor,
): () => void {
  let decorationIds: string[] = [];

  function update() {
    const model = editorInstance.getModel();
    if (!model) return;

    const text = model.getValue();
    const references = findWalkerOSReferences(text);

    const decorations: editor.IModelDeltaDecoration[] = references.map(
      (ref) => {
        const startPos = model.getPositionAt(ref.startIndex);
        const endPos = model.getPositionAt(ref.endIndex);
        const pattern = REFERENCE_PATTERNS.find((p) => p.type === ref.type)!;

        return {
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          options: { inlineClassName: pattern.className },
        };
      },
    );

    decorationIds = editorInstance.deltaDecorations(decorationIds, decorations);
  }

  update();
  const disposable = editorInstance.onDidChangeModelContent(() => update());

  return () => {
    disposable.dispose();
    editorInstance.deltaDecorations(decorationIds, []);
  };
}

/**
 * Register CSS styles for walkerOS reference decorations.
 * Call once on app init.
 */
export function registerWalkerOSDecorationStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('walkeros-ref-styles')) return;

  const style = document.createElement('style');
  style.id = 'walkeros-ref-styles';
  style.textContent = `
    .monaco-editor .elb-ref-variable { color: #89ddff !important; font-style: italic; }
    .monaco-editor .elb-ref-definition { color: #c3e88d !important; font-style: italic; }
    .monaco-editor .elb-ref-secret { color: #ffcb6b !important; font-style: italic; }
    .monaco-editor .elb-ref-env { color: #ffcb6b !important; font-style: italic; }
    .monaco-editor .elb-ref-code { color: #c084fc !important; }
  `;
  document.head.appendChild(style);
}
