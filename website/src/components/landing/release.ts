/**
 * The `major.minor` line of a walkerOS version, for the release announcement.
 * Throws for anything but `x.y.z`: a failed build is visible, an announcement
 * saying "vundefined" is not.
 */
export function releaseLine(version: string): string {
  const match = /^(\d+)\.(\d+)\.\d+$/.exec(version);
  if (!match) throw new Error(`walkerOS version "${version}" is not x.y.z`);
  return `${match[1]}.${match[2]}`;
}
