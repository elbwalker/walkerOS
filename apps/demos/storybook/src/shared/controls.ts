import type { Elb } from '@walkeros/core';
import type { SourceBrowser } from '@walkeros/web-source-browser';
import type { DemoConsent } from './consent';
import type { Language } from './language';
import type { PersonaKey } from './personas';

/**
 * What a demo page needs from whoever runs it (the demo site or a story):
 * the current choices and the callbacks the shared controls call. The page
 * never knows which walkerOS runs it.
 */
export interface DemoControls {
  persona: PersonaKey;
  onPersonaSwitch: (key: PersonaKey) => void;
  language: Language;
  onLanguageToggle: (next: Language) => void;
  consent: DemoConsent;
  /** For ViewSource: looks the running elb up when an edit is applied. */
  elb: SourceBrowser.Push;
}

export interface DemoPageProps {
  controls: DemoControls;
}

/**
 * A page global elb as the page holds it: a function the page calls with
 * whatever arguments it has. The browser source reports the ones it ignores.
 */
export type PageElb = (...args: unknown[]) => Promise<Elb.PushResult>;

/** Why a command was not sent: no walkerOS runs on the page (yet). */
export const notRunning = 'walkerOS is not running.';

/**
 * A stable elb for `DemoControls.elb` that looks the running one up at each
 * call, so a walkerOS that starts after the page's first render (the addon,
 * a walker.js loaded later) still gets the call. Without one it resolves
 * `{ ok: false }` with the reason, which ViewSource shows.
 */
export function elbAtApplyFrom(
  getElb: () => PageElb | undefined,
): SourceBrowser.Push {
  return (...args: unknown[]) => {
    const elb = getElb();
    return elb
      ? elb(...args)
      : Promise.resolve({ ok: false, error: notRunning });
  };
}
