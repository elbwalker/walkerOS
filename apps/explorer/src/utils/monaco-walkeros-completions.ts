import type { IntelliSenseContext, PackageInfo } from '../types/intellisense';
import { getContractPathCompletions } from './contract-path-walker';

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

export function getStoreCompletions(
  stores: IntelliSenseContext['stores'],
): CompletionEntry[] {
  if (!stores || stores.length === 0) return [];
  return stores.map((id) => ({
    label: `$store.${id}`,
    insertText: `$store.${id}`,
    detail: '(store)',
    documentation: `Store reference. Injected as store instance at runtime.`,
    kind: 'reference' as const,
    sortText: '0_store_' + id,
  }));
}

export function getFlowCompletions(
  flows: IntelliSenseContext['flows'],
): CompletionEntry[] {
  if (!flows || flows.length === 0) return [];
  return flows.map((name) => ({
    label: `$flow.${name}`,
    insertText: `$flow.${name}`,
    detail: '(flow)',
    documentation: `Cross-flow reference. Resolves to the resolved Flow.Config of "${name}" at runtime. Append \`.url\`, \`.settings.<key>\`, or another path inside that flow's config.`,
    kind: 'reference' as const,
    sortText: '0_flow_' + name,
  }));
}

export function getEnvCompletions(
  envNames: IntelliSenseContext['envNames'],
): CompletionEntry[] {
  if (!envNames || envNames.length === 0) return [];
  return envNames.map((name) => ({
    label: `$env.${name}`,
    insertText: `$env.${name}`,
    detail: '(env var)',
    documentation: `Environment variable. Resolved from process.env at runtime. Add a literal default with $env.${name}:default.`,
    kind: 'variable' as const,
    sortText: '0_env_' + name,
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

/** Top-level WalkerOS event fields available in mapping values */
const EVENT_ROOT_FIELDS: CompletionEntry[] = [
  {
    label: 'data',
    insertText: 'data',
    detail: '(event data)',
    kind: 'property',
    sortText: '0_event_data',
  },
  {
    label: 'globals',
    insertText: 'globals',
    detail: '(global properties)',
    kind: 'property',
    sortText: '0_event_globals',
  },
  {
    label: 'user',
    insertText: 'user',
    detail: '(user properties)',
    kind: 'property',
    sortText: '0_event_user',
  },
  {
    label: 'context',
    insertText: 'context',
    detail: '(context data)',
    kind: 'property',
    sortText: '0_event_context',
  },
  {
    label: 'custom',
    insertText: 'custom',
    detail: '(custom properties)',
    kind: 'property',
    sortText: '0_event_custom',
  },
  {
    label: 'consent',
    insertText: 'consent',
    detail: '(consent state)',
    kind: 'property',
    sortText: '0_event_consent',
  },
  {
    label: 'nested',
    insertText: 'nested',
    detail: '(nested entities)',
    kind: 'property',
    sortText: '0_event_nested',
  },
  {
    label: 'entity',
    insertText: 'entity',
    detail: '(string)',
    kind: 'property',
    sortText: '1_event_entity',
  },
  {
    label: 'action',
    insertText: 'action',
    detail: '(string)',
    kind: 'property',
    sortText: '1_event_action',
  },
  {
    label: 'name',
    insertText: 'name',
    detail: '(string)',
    kind: 'property',
    sortText: '1_event_name',
  },
  {
    label: 'trigger',
    insertText: 'trigger',
    detail: '(string)',
    kind: 'property',
    sortText: '1_event_trigger',
  },
  {
    label: 'timestamp',
    insertText: 'timestamp',
    detail: '(number)',
    kind: 'property',
    sortText: '1_event_timestamp',
  },
  {
    label: 'timing',
    insertText: 'timing',
    detail: '(number)',
    kind: 'property',
    sortText: '1_event_timing',
  },
  {
    label: 'id',
    insertText: 'id',
    detail: '(string)',
    kind: 'property',
    sortText: '1_event_id',
  },
  {
    label: 'group',
    insertText: 'group',
    detail: '(string)',
    kind: 'property',
    sortText: '1_event_group',
  },
  {
    label: 'count',
    insertText: 'count',
    detail: '(number)',
    kind: 'property',
    sortText: '1_event_count',
  },
  {
    label: 'source',
    insertText: 'source',
    detail: '(source info)',
    kind: 'property',
    sortText: '1_event_source',
  },
  {
    label: 'version',
    insertText: 'version',
    detail: '(version info)',
    kind: 'property',
    sortText: '1_event_version',
  },
];

/**
 * Get mapping value path completions based on contract schemas.
 *
 * When typing "data." inside a mapping rule for entity "page" action "view",
 * this returns the properties defined in the contract for page.view.
 */
export function getMappingPathCompletions(
  contractRaw: IntelliSenseContext['contractRaw'],
  entity: string,
  action: string,
  prefix: string,
): CompletionEntry[] {
  if (!prefix) return EVENT_ROOT_FIELDS;

  if (!contractRaw || Object.keys(contractRaw).length === 0) return [];

  const sectionMap: Record<string, string> = {
    data: 'events',
    globals: 'globals',
    context: 'context',
    custom: 'custom',
    user: 'user',
    consent: 'consent',
  };

  const section = sectionMap[prefix];
  if (!section) return [];

  const allCompletions: CompletionEntry[] = [];
  const seen = new Set<string>();

  for (const contractName of Object.keys(contractRaw)) {
    const pathSegments =
      section === 'events'
        ? [contractName, 'events', entity, action]
        : [contractName, section];

    const completions = getContractPathCompletions(
      contractRaw as Record<string, Record<string, unknown>>,
      pathSegments,
    );

    for (const c of completions) {
      if (seen.has(c.key)) continue;
      seen.add(c.key);
      allCompletions.push({
        label: `${prefix}.${c.key}`,
        insertText: `${prefix}.${c.key}`,
        detail: c.type ? `(${c.type})` : '(property)',
        documentation: `Event property from contract. Maps to event.${prefix}.${c.key}.`,
        kind: 'property' as const,
        sortText: `0_mapping_${c.key}`,
      });
    }
  }

  return allCompletions;
}

export function getContractCompletions(
  contractRaw: IntelliSenseContext['contractRaw'],
  pathSegments: string[],
): CompletionEntry[] {
  if (!contractRaw || Object.keys(contractRaw).length === 0) return [];

  const completions = getContractPathCompletions(
    contractRaw as Record<string, Record<string, unknown>>,
    pathSegments,
  );

  const prefix =
    pathSegments.length > 0
      ? `$contract.${pathSegments.join('.')}.`
      : '$contract.';

  return completions.map((c) => ({
    label: `${prefix}${c.key}`.replace(/\.$/, ''),
    insertText:
      pathSegments.length === 0
        ? `$contract.${c.key}`
        : `$contract.${pathSegments.join('.')}.${c.key}`,
    detail: c.type ? `(${c.type})` : c.detail ? `(${c.detail})` : '(contract)',
    documentation: `Contract reference. Resolves to the ${c.key} ${c.detail || 'value'} at runtime.`,
    kind: 'property' as const,
    sortText: '0_contract_' + pathSegments.concat(c.key).join('_'),
  }));
}
