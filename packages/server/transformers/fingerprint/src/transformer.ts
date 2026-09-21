import type { Mapping, Transformer } from '@walkeros/core';
import {
  anonymizeIP,
  createMappingRoot,
  getBrowser,
  getBrowserVersion,
  getMappingValue,
  getOS,
  setByPath,
} from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';
import type { FingerprintSettings } from './types';

type InputName = 'ip' | 'userAgent' | 'site';

interface Input {
  name: InputName;
  value: Mapping.Value;
}

const inputNames: InputName[] = ['ip', 'userAgent', 'site'];

const defaultInputs: Record<InputName, Mapping.Value> = {
  ip: 'ingest.ip',
  userAgent: 'ingest.userAgent',
  site: 'event.source.url',
};

// Each named input is reduced before hashing, so the hash never carries
// more than the reduced value.
const reduceInput: Record<InputName, (value: string) => string> = {
  ip: anonymizeIP,
  userAgent: (ua) =>
    [getBrowser(ua), getBrowserVersion(ua), getOS(ua)]
      .map((part) => part ?? '')
      .join('/'),
  site: toHostname,
};

function toHostname(value: string): string {
  try {
    return new URL(value).hostname || value;
  } catch {
    return value; // Not a URL, e.g. a site id
  }
}

function rotationWindow(rotate: FingerprintSettings['rotate']): string {
  if (rotate === 'none') return '';
  const now = new Date().toISOString();
  return rotate === 'hourly' ? now.slice(0, 13) : now.slice(0, 10);
}

/**
 * Fingerprint transformer - a cookieless, privacy-friendly visitor hash.
 *
 * Hashes the rotation window, the named inputs (anonymized IP, reduced user
 * agent, site) and any extra fields with an HMAC keyed by the salt, and
 * stores the result at the output path.
 *
 * @example
 * transformerFingerprint({
 *   config: {
 *     settings: { salt: '$env.FINGERPRINT_SALT' },
 *   },
 * })
 */
export const transformerFingerprint: Transformer.Init<
  Transformer.Types<FingerprintSettings>
> = (context) => {
  const { config, logger } = context;
  const settings: Partial<FingerprintSettings> = config.settings ?? {};
  const fields: Mapping.Value[] = settings.fields || [];
  const output: string = settings.output || 'user.hash';
  const length: number | undefined = settings.length;
  const salt: string | undefined = settings.salt || undefined;
  const rotate = settings.rotate ?? 'daily';

  // Named inputs default on only without fields, so a fields config keeps its input set
  const inputs: Input[] = [];
  for (const name of inputNames) {
    const value =
      settings[name] ?? (settings.fields ? false : defaultInputs[name]);
    if (value !== false) inputs.push({ name, value });
  }

  if (!salt)
    logger.warn(
      'Fingerprint has no salt: the hash can be reversed to the IP by brute force. Set settings.salt, e.g. "$env.FINGERPRINT_SALT".',
    );

  const warnedEmpty = new Set<InputName>();

  return {
    type: 'fingerprint',
    config: config as Transformer.Config<
      Transformer.Types<FingerprintSettings>
    >,

    async push(event, context) {
      const { ingest, collector } = context;

      const source = createMappingRoot(ingest, event);
      const resolve = async (value: Mapping.Value) =>
        String((await getMappingValue(source, value, { collector })) ?? '');

      const inputValues = await Promise.all(
        inputs.map(async ({ name, value }) => {
          const resolved = await resolve(value);
          const reduced = resolved ? reduceInput[name](resolved) : '';

          if (!reduced && !warnedEmpty.has(name)) {
            warnedEmpty.add(name);
            logger.warn(
              `Fingerprint input "${name}" resolved empty, so hashes are less distinct. Check the source's config.ingest or set settings.${name}.`,
            );
          }

          return reduced;
        }),
      );

      const fieldValues = await Promise.all(fields.map(resolve));

      // A separator keeps 'ab' + 'c' and 'a' + 'bc' apart
      const input = [
        rotationWindow(rotate),
        ...inputValues,
        ...fieldValues,
      ].join('\u001f');

      const hash = await getHashServer(
        input,
        length,
        salt ? { key: salt } : {},
      );
      return { event: setByPath(event, output, hash) };
    },
  };
};
