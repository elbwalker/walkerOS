import type { Flow } from './types';
import { isObject } from './is';
import { REF_SECRET } from './references';

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

type Fail = (message: string) => never;

/**
 * The destination config keys a minimal example may set: the keys of its
 * type, so a key added there must be listed here too.
 */
const CONFIG_KEYS: Record<
  keyof NonNullable<Flow.MinimalExample['config']>,
  true
> = { loadScript: true };

/** `google-ads` to `googleAds`. */
function camel(value: string): string {
  return value.replace(/[-_.]+([a-z0-9])/gi, (_, char: string) =>
    char.toUpperCase(),
  );
}

function tsString(value: string): string {
  const escaped = JSON.stringify(value)
    .slice(1, -1)
    .replace(/\\"/g, '"')
    .replace(/'/g, "\\'");
  return `'${escaped}'`;
}

/** The source of an entry's value, given the indent of the entry's line. */
type EntrySource = (indent: string) => string;

/**
 * Object entries as TypeScript source, one per line, Prettier's layout. Each
 * value is rendered at its entry's indent, so nesting indents at any depth.
 */
function tsObject(
  entries: Array<[string, EntrySource]>,
  indent: string,
): string {
  if (!entries.length) return '{}';
  const inner = `${indent}  `;
  const lines = entries.map(
    ([key, source]) =>
      `${inner}${IDENTIFIER.test(key) ? key : tsString(key)}: ${source(inner)},\n`,
  );
  return `{\n${lines.join('')}${indent}}`;
}

/** A JSON value as TypeScript source; anything that is not JSON fails. */
function tsValue(
  value: unknown,
  indent: string,
  path: string,
  fail: Fail,
): string {
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return tsString(value);
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    const items = value.map(
      (item, index) =>
        `${inner}${tsValue(item, inner, `${path}[${index}]`, fail)},\n`,
    );
    return `[\n${items.join('')}${indent}]`;
  }
  if (isObject(value))
    return tsObject(
      Object.entries(value).map(([key, item]) => [
        key,
        (at) => tsValue(item, at, `${path}.${key}`, fail),
      ]),
      indent,
    );
  return fail(`${path} is not JSON`);
}

/**
 * Compose a destination package's quickstart from its `$meta` and its
 * minimal example: the install line, the integrated code, a complete v4 flow
 * and the settings the conformance kit runs with. A package with several
 * exports names the export the minimal example belongs to. Throws when the
 * inputs do not resolve to one runnable setup, so a docs build that renders
 * it fails instead of showing a broken snippet.
 */
export function composeQuickstart(
  meta: Flow.PackageMeta,
  minimal: Flow.MinimalExample,
  exportName?: string,
): Flow.Quickstart {
  const name = isObject(meta) ? meta.package : undefined;
  if (typeof name !== 'string' || !name)
    throw new Error('the package metadata names no package');
  const fail: Fail = (message) => {
    throw new Error(`minimal example of ${name}: ${message}`);
  };

  // First: a page of a package with several exports names its export.
  const declared = Object.keys(meta.exports ?? {});
  if (exportName === undefined && declared.length > 1)
    throw new Error(
      `${name} has several exports (${declared.join(', ')}): name the export the minimal example belongs to`,
    );
  if (exportName !== undefined && !declared.includes(exportName))
    throw new Error(`${name} declares no export ${exportName}`);

  if (!isObject(minimal)) throw new Error(`${name} has no minimal example`);
  const { settings } = minimal;
  if (!isObject(settings))
    throw new Error(`minimal example of ${name} has no settings`);

  if (meta.type !== 'destination')
    throw new Error(
      `${name} is ${meta.type ? `a ${meta.type}` : 'no step package'}: a quickstart is composed for destinations only`,
    );
  const platforms = meta.platform ?? [];
  if (platforms.length !== 1)
    throw new Error(
      `${name} declares ${platforms.length ? `the platforms ${platforms.join(', ')}` : 'no platform'}: a quickstart needs exactly one`,
    );
  const platform = platforms[0];
  if (platform !== 'web' && platform !== 'server')
    throw new Error(
      `${name} declares the platform ${platform}: a flow runs on web or server`,
    );

  const { config } = minimal;
  if (config !== undefined) {
    if (!isObject(config)) fail('config is no object');
    const extra = Object.keys(config).filter((key) => !(key in CONFIG_KEYS));
    if (extra.length)
      fail(
        `config sets ${extra.join(', ')}, but a minimal example sets only ${Object.keys(CONFIG_KEYS).join(', ')}`,
      );
    if (
      config.loadScript !== undefined &&
      typeof config.loadScript !== 'boolean'
    )
      fail('config.loadScript is no boolean');
  }

  // A credential is a `$secret` in the flow, so it is masked in logs and
  // injected on deploy; a web flow refuses it (it would reach the browser).
  const secrets = minimal.secrets ?? {};
  if (Object.keys(secrets).length && platform === 'web')
    fail('a web flow holds no secret (secrets resolve on server flows only)');
  for (const [key, secret] of Object.entries(secrets)) {
    if (!(key in settings))
      fail(`the secret ${key} has no placeholder in settings`);
    // Also an identifier, so the integrated code reads it as process.env.<NAME>.
    if (
      typeof secret !== 'string' ||
      !REF_SECRET.test(`$secret.${secret}`) ||
      !IDENTIFIER.test(secret)
    )
      fail(
        `the secret ${key} names ${String(secret)}, which is not a secret name (A-Z, 0-9 and _)`,
      );
  }

  // The step key and the binding of the import, from the export or the name.
  const unscoped = name.replace(/^@[^/]+\//, '');
  const marker = unscoped.lastIndexOf('destination-');
  const base =
    marker === -1 ? unscoped : unscoped.slice(marker + 'destination-'.length);
  const key = exportName
    ? exportName.replace(/^destination/i, '').toLowerCase() ||
      exportName.toLowerCase()
    : camel(base);
  const binding = exportName ?? camel(`destination-${base}`);
  if (!IDENTIFIER.test(key) || !IDENTIFIER.test(binding))
    throw new Error(`${name}: no identifier to import it as`);

  const settingsSource = tsObject(
    Object.entries(settings).map(([setting, value]) => [
      setting,
      (at) =>
        secrets[setting] !== undefined
          ? `process.env.${secrets[setting]}`
          : tsValue(value, at, `settings.${setting}`, fail),
    ]),
    '        ',
  );
  const runSettings: Record<string, unknown> = JSON.parse(
    JSON.stringify(settings),
  );
  const flowSettings: Record<string, unknown> = { ...runSettings };
  for (const [setting, secret] of Object.entries(secrets))
    flowSettings[setting] = `$secret.${secret}`;

  const configSource = Object.entries(config ?? {})
    .map(
      ([key, value]) =>
        `\n        ${key}: ${tsValue(value, '        ', `config.${key}`, fail)},`,
    )
    .join('');
  const integrated = `import { startFlow } from '@walkeros/collector';
import ${exportName ? `{ ${binding} }` : binding} from '${name}';

await startFlow({
  destinations: {
    ${key}: {
      code: ${binding},
      config: {${configSource}
        settings: ${settingsSource},
      },
    },
  },
});
`;

  return {
    install: `npm install @walkeros/collector ${name}`,
    integrated,
    flow: {
      version: 4,
      flows: {
        default: {
          config: { platform },
          destinations: {
            [key]: {
              package: name,
              ...(exportName ? { import: exportName } : {}),
              config: { ...config, settings: flowSettings },
            },
          },
        },
      },
    },
    run: { settings: runSettings, ...(config ? { config } : {}) },
  };
}
