import type { IntelliSenseContext } from '../types/intellisense';

export interface ValidationIssue {
  message: string;
  severity: 'error' | 'warning' | 'info';
  startIndex: number;
  endIndex: number;
}

/**
 * Validate walkerOS references in JSON text against the current context.
 * Returns issues for dangling references and invalid cross-references.
 */
export function validateWalkerOSReferences(
  text: string,
  context: Partial<IntelliSenseContext>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check $var. references
  if (context.variables) {
    const varRegex = /\$var\.(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(text)) !== null) {
      if (!(match[1] in context.variables)) {
        issues.push({
          message: `Unknown variable "$var.${match[1]}". Defined variables: ${Object.keys(context.variables).join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check $def. references
  if (context.definitions) {
    const defRegex = /\$def\.(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = defRegex.exec(text)) !== null) {
      if (!(match[1] in context.definitions)) {
        issues.push({
          message: `Unknown definition "$def.${match[1]}". Defined: ${Object.keys(context.definitions).join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check $secret. references
  if (context.secrets) {
    const secretRegex = /\$secret\.(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = secretRegex.exec(text)) !== null) {
      if (!context.secrets.includes(match[1])) {
        issues.push({
          message: `Unknown secret "$secret.${match[1]}". Available: ${context.secrets.join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Check next/before cross-references
  if (context.stepNames?.transformers) {
    const nextRegex = /"(?:next|before)"\s*:\s*"(\w+)"/g;
    let match: RegExpExecArray | null;
    while ((match = nextRegex.exec(text)) !== null) {
      if (!context.stepNames.transformers.includes(match[1])) {
        issues.push({
          message: `Unknown transformer "${match[1]}". Available: ${context.stepNames.transformers.join(', ') || 'none'}`,
          severity: 'warning',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  return issues;
}
