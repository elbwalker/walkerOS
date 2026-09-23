// Customer information parameters accepted in user_data:
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
// fbclid is not sent; the destination turns it into fbc.
export const userDataKeys = [
  'em',
  'ph',
  'fn',
  'ln',
  'db',
  'ge',
  'ct',
  'st',
  'zp',
  'country',
  'external_id',
  'client_ip_address',
  'client_user_agent',
  'fbc',
  'fbp',
  'subscription_id',
  'fb_login_id',
  'lead_id',
  'anon_id',
  'madid',
  'page_id',
  'page_scoped_user_id',
  'ctwa_clid',
  'ig_account_id',
  'ig_sid',
  'fbclid',
] as const;

export function getUnknownUserDataKeys(userData: object): string[] {
  const known: readonly string[] = userDataKeys;
  return Object.keys(userData).filter((key) => !known.includes(key));
}
