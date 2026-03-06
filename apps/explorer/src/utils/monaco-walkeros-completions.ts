import type { IntelliSenseContext, PackageInfo } from '../types/intellisense';

export interface CompletionEntry {
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
  kind: 'variable' | 'reference' | 'secret' | 'module' | 'property';
  sortText?: string;
}

export function getVariableCompletions(
  variables: IntelliSenseContext['variables'],
): CompletionEntry[] {
  if (!variables || Object.keys(variables).length === 0) return [];
  return Object.entries(variables).map(([name, value]) => ({
    label: `$var.${name}`,
    insertText: `$var.${name}`,
    detail: `= ${JSON.stringify(value)}`,
    documentation: `Variable reference. Resolves to \`${JSON.stringify(value)}\` at runtime.`,
    kind: 'variable' as const,
    sortText: '0_var_' + name,
  }));
}

export function getDefinitionCompletions(
  definitions: IntelliSenseContext['definitions'],
): CompletionEntry[] {
  if (!definitions || Object.keys(definitions).length === 0) return [];
  return Object.keys(definitions).map((name) => ({
    label: `$def.${name}`,
    insertText: `$def.${name}`,
    detail: '(definition)',
    documentation: `Definition reference. Injects the reusable config fragment "${name}" at runtime.`,
    kind: 'reference' as const,
    sortText: '0_def_' + name,
  }));
}

export function getSecretCompletions(
  secrets: IntelliSenseContext['secrets'],
): CompletionEntry[] {
  if (!secrets || secrets.length === 0) return [];
  return secrets.map((name) => ({
    label: `$secret.${name}`,
    insertText: `$secret.${name}`,
    detail: '(secret)',
    documentation:
      'Secret reference. Value is securely injected at runtime. Never stored in config.',
    kind: 'secret' as const,
    sortText: '0_secret_' + name,
  }));
}

export function getPackageCompletions(
  packages: PackageInfo[] | undefined,
  platform: IntelliSenseContext['platform'],
): CompletionEntry[] {
  if (!packages || packages.length === 0) return [];
  const filtered = platform
    ? packages.filter((p) => p.platform === platform)
    : packages;
  return filtered.map((pkg) => ({
    label: pkg.package,
    insertText: pkg.package,
    detail: `${pkg.type} (${pkg.platform})`,
    documentation: `walkerOS ${pkg.type}: ${pkg.shortName}`,
    kind: 'module' as const,
    sortText: '1_pkg_' + pkg.shortName,
  }));
}

export function getStepNameCompletions(
  stepNames: IntelliSenseContext['stepNames'],
  context: 'next' | 'before',
): CompletionEntry[] {
  if (!stepNames) return [];
  const names = stepNames.transformers || [];
  return names.map((name) => ({
    label: name,
    insertText: name,
    detail: `transformer (${context} chain)`,
    documentation: `Reference to transformer step "${name}" in this flow config.`,
    kind: 'reference' as const,
    sortText: '0_step_' + name,
  }));
}
