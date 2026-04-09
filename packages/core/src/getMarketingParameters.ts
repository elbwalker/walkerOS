import type { WalkerOS } from './types';
import { assign } from './assign';
import { z } from './schemas/validation';

export interface MarketingParameters {
  [key: string]: string;
}

/**
 * Click-ID registry entry — maps a URL parameter name to a canonical platform.
 */
export const ClickIdEntrySchema = z.object({
  param: z
    .string()
    .describe(
      'Lowercase URL parameter name. Match is case-insensitive on lookup.',
    ),
  platform: z
    .string()
    .describe('Canonical platform identifier (lowercase, kebab-case).'),
});

export type ClickIdEntry = z.infer<typeof ClickIdEntrySchema>;

/**
 * Default click-ID registry.
 *
 * Ordered by priority: when a URL contains multiple click IDs, the entry
 * appearing earlier wins as the resolved `clickId` / `platform`. All matched
 * raw values are still preserved on the result.
 *
 * Extend via the third argument to {@link getMarketingParameters} or the
 * `clickIds` field in the session source settings.
 */
export const defaultClickIds: ClickIdEntry[] = [
  // Google family — highest priority (most common globally)
  { param: 'gclid', platform: 'google' },
  { param: 'wbraid', platform: 'google' },
  { param: 'gbraid', platform: 'google' },
  { param: 'dclid', platform: 'google' },
  { param: 'gclsrc', platform: 'google' },

  // Meta
  { param: 'fbclid', platform: 'meta' },
  { param: 'igshid', platform: 'meta' },

  // Microsoft / Bing
  { param: 'msclkid', platform: 'microsoft' },

  // TikTok
  { param: 'ttclid', platform: 'tiktok' },

  // X / Twitter
  { param: 'twclid', platform: 'twitter' },

  // LinkedIn
  { param: 'li_fat_id', platform: 'linkedin' },

  // Pinterest
  { param: 'epik', platform: 'pinterest' },

  // Snapchat — both spellings seen in the wild
  { param: 'sclid', platform: 'snapchat' },
  { param: 'sccid', platform: 'snapchat' },

  // Reddit
  { param: 'rdt_cid', platform: 'reddit' },

  // Quora
  { param: 'qclid', platform: 'quora' },

  // Yandex (yclid collides with Yahoo Japan; Yandex chosen as default)
  { param: 'yclid', platform: 'yandex' },
  { param: 'ymclid', platform: 'yandex' },
  { param: 'ysclid', platform: 'yandex' },

  // Content discovery
  { param: 'dicbo', platform: 'outbrain' },
  { param: 'obclid', platform: 'outbrain' },
  { param: 'tblci', platform: 'taboola' },

  // Email service providers
  { param: 'mc_cid', platform: 'mailchimp' },
  { param: 'mc_eid', platform: 'mailchimp' },
  { param: '_kx', platform: 'klaviyo' },
  { param: '_hsenc', platform: 'hubspot' },
  { param: '_hsmi', platform: 'hubspot' },

  // Adobe / Marketo
  { param: 's_kwcid', platform: 'adobe' },
  { param: 'ef_id', platform: 'adobe' },
  { param: 'mkt_tok', platform: 'adobe' },

  // Affiliate
  { param: 'irclickid', platform: 'impact' },
  { param: 'cjevent', platform: 'cj' },

  // Deep linking
  { param: '_branch_match_id', platform: 'branch' },
];

/**
 * Extracts marketing parameters from a URL.
 *
 * - UTM and custom params are mapped to friendly names (`utm_source` → `source`).
 * - Known click IDs are detected case-insensitively; each raw value is stored
 *   under its canonical lowercase param name.
 * - `clickId` and `platform` reference the highest-priority match (first entry
 *   in the registry present in the URL).
 * - Custom `clickIds` override default platforms by `param` in place and
 *   append new params at the end of the priority list.
 */
export function getMarketingParameters(
  url: URL,
  custom: MarketingParameters = {},
  clickIds: ClickIdEntry[] = [],
): WalkerOS.Properties {
  const data: WalkerOS.Properties = {};

  // UTMs and custom mapped params
  const utmParams: MarketingParameters = {
    utm_campaign: 'campaign',
    utm_content: 'content',
    utm_medium: 'medium',
    utm_source: 'source',
    utm_term: 'term',
  };
  Object.entries(assign(utmParams, custom)).forEach(([key, name]) => {
    const value = url.searchParams.get(key);
    if (value) data[name] = value;
  });

  // Effective registry: defaults with user overrides applied in place,
  // plus brand-new user params appended at the end. Reuses the defaults
  // array when no customization is requested.
  const registry = clickIds.length ? mergeRegistry(clickIds) : defaultClickIds;

  // Lowercase URL params once for case-insensitive lookup
  const lower = new Map<string, string>();
  url.searchParams.forEach((value, key) => {
    if (value) lower.set(key.toLowerCase(), value);
  });

  // Walk registry in priority order; first match wins as clickId/platform
  for (const entry of registry) {
    const value = lower.get(entry.param);
    if (!value) continue;
    data[entry.param] = value;
    if (!data.clickId) {
      data.clickId = entry.param;
      data.platform = entry.platform;
    }
  }

  return data;
}

function mergeRegistry(user: ClickIdEntry[]): ClickIdEntry[] {
  const overrides = new Map(user.map((e) => [e.param, e.platform]));
  const defaultParams = new Set(defaultClickIds.map((e) => e.param));
  return [
    ...defaultClickIds.map((e) =>
      overrides.has(e.param)
        ? { param: e.param, platform: overrides.get(e.param)! }
        : e,
    ),
    ...user.filter((e) => !defaultParams.has(e.param)),
  ];
}
