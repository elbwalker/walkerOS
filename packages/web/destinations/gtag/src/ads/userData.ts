import type { WalkerOS, Collector } from '@walkeros/core';
import { getMappingValue } from '@walkeros/core';
import type { AdsSettings } from '../types';

/**
 * Resolves user data for Google Enhanced Conversions.
 *
 * enhancedConversions is a UserDataMapping: each field is a mapping value
 * resolved against the event via getMappingValue. Map from event.user
 * (like `user.email`), event.data, or anywhere a mapping value can reach.
 *
 * Returns undefined if no enhanced conversions configured or no user
 * data resolved (the set user_data call should be skipped in that case).
 */
export async function resolveUserData(
  event: WalkerOS.Event,
  settings: AdsSettings,
  collector: Collector.Instance,
): Promise<Record<string, unknown> | undefined> {
  const ec = settings.enhancedConversions;
  if (!ec) return undefined;

  const userData: Record<string, unknown> = {};

  if (ec.email) {
    const val = await getMappingValue(event, ec.email, { collector });
    if (val) userData.email = val;
  }
  if (ec.phone_number) {
    const val = await getMappingValue(event, ec.phone_number, { collector });
    if (val) userData.phone_number = val;
  }
  if (ec.address) {
    const address: Record<string, unknown> = {};
    for (const [key, mapping] of Object.entries(ec.address)) {
      if (mapping) {
        const val = await getMappingValue(event, mapping, { collector });
        if (val) address[key] = val;
      }
    }
    if (Object.keys(address).length > 0) userData.address = address;
  }

  return Object.keys(userData).length > 0 ? userData : undefined;
}
