/**
 * Anonymizes an IPv4 address by setting the last octet to 0.
 *
 * @param ip The IP address to anonymize.
 * @returns The anonymized IP address or an empty string if the IP is invalid.
 */
export function anonymizeIP(ip: string): string {
  const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;

  if (!ipv4Pattern.test(ip)) return '';

  return ip.replace(/\.\d+$/, '.0'); // Set the last octet to 0
}
