/**
 * Anonymizes an IP address: IPv4 keeps its /24, IPv6 its /48.
 *
 * An IPv4-mapped IPv6 address (`::ffff:1.2.3.4`, what a dual-stack listener
 * reports for an IPv4 client) is treated as the IPv4 address it carries.
 *
 * @param ip The IP address to anonymize.
 * @returns The anonymized IP address or an empty string if the IP is invalid.
 */
export function anonymizeIP(ip: string): string {
  const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const ipv4 = ip.replace(/^::ffff:/i, '');

  if (ipv4Pattern.test(ipv4)) return ipv4.replace(/\.\d+$/, '.0'); // Set the last octet to 0

  const groups = expandIPv6(ip);
  if (!groups) return '';

  return `${groups.slice(0, 3).join(':')}::`; // Keep the first 48 bits
}

/**
 * Expands an IPv6 address to its 8 groups, lowercase without leading zeros.
 * Returns undefined when the address is not valid IPv6.
 */
function expandIPv6(ip: string): string[] | undefined {
  const halves = ip.split('::');
  if (halves.length > 2) return;

  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return;

  const groups = [...head, ...Array<string>(missing).fill('0'), ...tail];
  if (!groups.every((group) => /^[\da-f]{1,4}$/i.test(group))) return;

  return groups.map((group) => parseInt(group, 16).toString(16));
}
