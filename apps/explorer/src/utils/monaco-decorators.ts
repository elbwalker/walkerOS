import type { editor } from 'monaco-editor';

/**
 * Regular expressions to match walkerOS data attributes
 */
const DATA_ELB_PATTERNS = [
  /\bdata-elb(?!-)\b/g, // data-elb (not followed by hyphen)
  /\bdata-elbaction\b/g, // data-elbaction
  /\bdata-elbactions\b/g, // data-elbactions
  /\bdata-elbglobals\b/g, // data-elbglobals
  /\bdata-elbcontext\b/g, // data-elbcontext
  /\bdata-elblink\b/g, // data-elblink
  /\bdata-elb-[\w-]+\b/g, // data-elb-* (property attributes)
];

/**
 * Apply decorations to highlight walkerOS data attributes in Monaco editor
 *
 * This function scans the editor content for data-elb* attributes and
 * applies color highlighting to match the website's Prism.js styling.
 *
 * @param editor - Monaco editor instance
 * @param monaco - Monaco module
 */
export function applyDataElbDecorations(
  monacoEditor: editor.IStandaloneCodeEditor,
  monaco: typeof import('monaco-editor'),
): () => void {
  const decorationIds: string[] = [];

  const updateDecorations = () => {
    const model = monacoEditor.getModel();
    if (!model) return;

    const content = model.getValue();
    const decorations: editor.IModelDeltaDecoration[] = [];

    // Find all matches for each pattern
    DATA_ELB_PATTERNS.forEach((pattern) => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const startPos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + match[0].length);

        decorations.push({
          range: new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column,
          ),
          options: {
            inlineClassName: 'elb-data-attribute',
            inlineClassNameAffectsLetterSpacing: true,
          },
        });
      }
    });

    // Apply decorations
    const newDecorationIds = monacoEditor.deltaDecorations(
      decorationIds,
      decorations,
    );
    decorationIds.length = 0;
    decorationIds.push(...newDecorationIds);
  };

  // Initial decoration
  updateDecorations();

  // Update decorations on content change
  const disposable = monacoEditor.onDidChangeModelContent(() => {
    updateDecorations();
  });

  // Return cleanup function
  return () => {
    disposable.dispose();
    monacoEditor.deltaDecorations(decorationIds, []);
  };
}

/**
 * Register CSS styles for data-elb attribute decorations
 * Call this once during app initialization
 */
export function registerDataElbStyles() {
  if (typeof document === 'undefined') return;

  const styleId = 'elb-monaco-data-attribute-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .monaco-editor .elb-data-attribute {
      color: var(--color-highlight-primary, #01b5e2) !important;
    }
  `;
  document.head.appendChild(style);
}
