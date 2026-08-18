import type { WalkerOS } from '@walkeros/core';
import {
  clone,
  createMockLogger,
  flattenIncludeSections,
  getEvent,
} from '@walkeros/core';
import { pushGA4Event, GA4_RESERVED_PARAMS } from '../ga4/push';
import { examples } from '../dev';
import type { GA4Settings } from '../types';

/**
 * GA4's published reserved vocabulary: names Google either ignores on an event
 * or reads with a built-in meaning of its own.
 *
 * Two groups are folded together on purpose, because both are names walkerOS
 * must never invent by accident:
 *  - reserved parameter names (cannot back a custom dimension)
 *  - manual traffic-source names, read into collected_traffic_source
 *
 * `currency`, `value` and `transaction_id` are deliberately ABSENT. Google
 * lists the first as reserved, but that restriction governs custom-dimension
 * registration, not sending, and all three are required on ecommerce events.
 * Adding them here would make this guard demand we delete revenue data.
 */
const GA4_RESERVED_VOCABULARY = [
  // Reserved parameter names
  'cid',
  'customer_id',
  'customerid',
  'dclid',
  'gclid',
  'session_id',
  'sessionid',
  'sfmc_id',
  'sid',
  'srsltid',
  'uid',
  'user_id',
  'userid',
  // Manual traffic-source names
  'campaign',
  'campaign_id',
  'content',
  'creative_format',
  'marketing_tactic',
  'medium',
  'source',
  'source_platform',
  'term',
] as const;

type ReservedVocabulary = (typeof GA4_RESERVED_VOCABULARY)[number];

/**
 * Compile-time guard over the `source` section.
 *
 * `include` emits `source_<key>` for every declared field, so a new entry on
 * `SourceFields` can silently manufacture a reserved GA4 name, which is
 * exactly how `source.platform` became `source_platform`. `SourceFields` is
 * kept index-signature-free for drift guards like this one, so `keyof` stays
 * a usable literal union here.
 *
 * If this stops compiling, a newly added source field composes into a reserved
 * name. Add it to GA4_RESERVED_PARAMS rather than widening this type.
 */
type SourceParamName = `source_${Extract<keyof WalkerOS.SourceFields, string>}`;
type UnstrippedSourceCollision = Exclude<
  Extract<SourceParamName, ReservedVocabulary>,
  keyof typeof GA4_RESERVED_PARAMS
>;
const _sourceDriftGuard: [UnstrippedSourceCollision] extends [never]
  ? true
  : false = true;

describe('GA4 reserved parameter guard', () => {
  const mockGtag = jest.fn();
  const mockEnv = clone(examples.env.push);
  mockEnv.window.gtag = mockGtag;

  const settings: GA4Settings = { measurementId: 'G-TEST123' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // getEvent()'s source is a collector, which carries no platform, so the
  // sections are filled out here to cover what a real web source emits.
  const fullEvent = (): WalkerOS.Event => {
    const event = getEvent('page view');
    return {
      ...event,
      source: {
        ...event.source,
        type: 'browser',
        platform: 'web',
        version: '1.2.3',
        url: 'https://example.com/',
        referrer: 'https://referrer.example/',
      },
      user: {
        ...event.user,
        hash: 'h4sh',
        email: 'user@example.com',
        country: 'DE',
      },
    };
  };

  it('_sourceDriftGuard holds', () => {
    expect(_sourceDriftGuard).toBe(true);
  });

  // The invariant, asserted end to end rather than by key enumeration: whatever
  // include produces, nothing reaching gtag may carry a reserved name.
  it('should emit no reserved parameter name from include all', () => {
    const event = fullEvent();
    const included = flattenIncludeSections(event, ['all']);

    pushGA4Event(event, settings, included, mockEnv, createMockLogger());

    const emitted = Object.keys(mockGtag.mock.calls[0][2]);
    const collisions = emitted.filter((name) =>
      GA4_RESERVED_VOCABULARY.some((reserved) => reserved === name),
    );

    expect(collisions).toEqual([]);
  });

  // Guards the other half: stripping must not become over-eager and start
  // eating the sections that carry the actual payload.
  it('should still emit the non-reserved include params', () => {
    const event = fullEvent();
    const included = flattenIncludeSections(event, ['all']);

    pushGA4Event(event, settings, included, mockEnv, createMockLogger());

    expect(mockGtag.mock.calls[0][2]).toMatchObject({
      source_type: 'browser',
      source_version: '1.2.3',
      user_hash: 'h4sh',
      event_entity: 'page',
    });
  });
});
