import type { Mapping, Transformer } from '@walkeros/core';
import {
  anonymizeIP,
  createMappingRoot,
  getBrowser,
  getBrowserVersion,
  getMappingValue,
  getOS,
  reportCause,
  setByPath,
  StepError,
  stepId,
} from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';
import type { FingerprintSettings } from './types';

type InputName = 'ip' | 'userAgent' | 'site';

interface Input {
  name: InputName;
  value: Mapping.Value;
}

const inputNames: InputName[] = ['ip', 'userAgent', 'site'];

// The site is the same for every visitor of a site, so it tells no visitors
// apart: a hash needs at least one of these inputs or a field.
const visitorInputs: InputName[] = ['ip', 'userAgent'];

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
  // Without a salt the hash can be reversed to the IP by brute force.
  const salt = settings.salt;
  if (!salt)
    throw new StepError('Config settings salt missing', { code: 'config' });
  const fields: Mapping.Value[] = settings.fields || [];
  const output: string = settings.output || 'user.hash';
  const length: number | undefined = settings.length;
  const rotate = settings.rotate ?? 'daily';

  // Named inputs default on only without fields, so a fields config keeps its input set
  const inputs: Input[] = [];
  for (const name of inputNames) {
    const value =
      settings[name] ?? (settings.fields ? false : defaultInputs[name]);
    if (value !== false) inputs.push({ name, value });
  }

  if (
    !fields.length &&
    !inputs.some(({ name }) => visitorInputs.includes(name))
  )
    throw new StepError(
      'Fingerprint has no input that tells visitors apart: keep settings.ip or settings.userAgent, or set settings.fields',
      { code: 'config' },
    );

  const warnedEmpty = new Set<InputName>();

  return {
    type: 'fingerprint',
    config: { ...config, settings: { ...settings, salt } },

    async push(event, context) {
      const { ingest, collector, id } = context;

      const source = createMappingRoot(ingest, event);
      const resolve = async (value: Mapping.Value) =>
        String((await getMappingValue(source, value, { collector })) ?? '');

      const resolvedValues = await Promise.all(
        inputs.map(({ value }) => resolve(value)),
      );
      const inputValues = resolvedValues.map((resolved, i) =>
        resolved ? reduceInput[inputs[i].name](resolved) : '',
      );

      const fieldValues = await Promise.all(fields.map(resolve));

      // Every visitor would get the same hash: fail instead of collapsing
      // the visitor counts.
      const distinct = [
        ...inputValues.filter((_, i) => visitorInputs.includes(inputs[i].name)),
        ...fieldValues,
      ];
      if (!distinct.some(Boolean))
        throw new StepError(
          "Fingerprint inputs resolved empty: no ip, user agent or field tells visitors apart. Check the source's config.ingest.",
          { code: 'missing-input' },
        );

      inputs.forEach(({ name, value }, i) => {
        if (inputValues[i]) return;

        // Only the ip reducer turns text into nothing: the value is not one
        // address (a forwarded chain, a word). The event is still delivered,
        // so this is reported, never thrown, and never carries the value.
        if (resolvedValues[i]) {
          const path = typeof value === 'string' ? ` (${value})` : '';
          reportCause(
            collector,
            logger,
            { step: stepId('transformer', id), code: 'invalid' },
            `Fingerprint input "${name}" is not one IP address, so the hash is made without it${path}`,
            {},
          );
          return;
        }

        if (warnedEmpty.has(name)) return;
        warnedEmpty.add(name);
        logger.warn(
          `Fingerprint input "${name}" resolved empty, so hashes are less distinct. Check the source's config.ingest or set settings.${name}.`,
        );
      });

      // A separator keeps 'ab' + 'c' and 'a' + 'bc' apart
      const input = [
        rotationWindow(rotate),
        ...inputValues,
        ...fieldValues,
      ].join('\u001f');

      const hash = await getHashServer(input, length, { key: salt });
      return { event: setByPath(event, output, hash) };
    },
  };
};
