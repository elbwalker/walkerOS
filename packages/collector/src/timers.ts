/**
 * Lets a Node process exit while the timer is pending: a timer that only
 * sweeps or reports must not keep a short script alive. A browser timer is a
 * number and holds nothing to release.
 */
export function unrefTimer(timer: ReturnType<typeof setInterval>): void {
  if (typeof timer === 'object' && 'unref' in timer) timer.unref();
}
