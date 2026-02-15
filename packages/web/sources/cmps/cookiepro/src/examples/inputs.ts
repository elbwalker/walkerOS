/**
 * Example CookiePro OptanonActiveGroups strings.
 *
 * These represent real consent states from CookiePro/OneTrust CMP.
 * Format: comma-separated active category IDs with leading/trailing commas.
 * Only active groups are listed. Absence means denied.
 */

/**
 * Full consent - user accepted all categories
 */
export const fullConsent = ',C0001,C0002,C0003,C0004,C0005,';

/**
 * Partial consent - necessary + functional only
 */
export const partialConsent = ',C0001,C0003,';

/**
 * Minimal consent - only strictly necessary (always active)
 */
export const minimalConsent = ',C0001,';

/**
 * Analytics only - necessary + performance
 */
export const analyticsOnlyConsent = ',C0001,C0002,';

/**
 * Marketing only - necessary + targeting
 */
export const marketingOnlyConsent = ',C0001,C0004,';

/**
 * Empty string - no consent yet or cleared
 */
export const emptyConsent = '';

/**
 * Custom category IDs - some installations use custom IDs
 */
export const customCategoryConsent = ',C0001,CUSTOM01,CUSTOM02,';
