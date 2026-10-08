import { useState } from 'react';
import type { SourceBrowser } from '@walkeros/web-source-browser';
import { useDemoConsent } from '../consent';
import { elbAtApplyFrom, type DemoControls } from '../controls';
import type { Language } from '../language';
import type { PersonaKey } from '../personas';

// The Storybook addon starts the collector in the preview and exposes its
// browser source's elb here. It is missing until the addon has started (or
// when it failed to).
declare global {
  interface Window {
    __storybookElb?: SourceBrowser.Push;
  }
}

// The addon sets window.__storybookElb when it has started, after the page's
// first render, so both consent and ViewSource look it up when they send.
const storyElb = () => window.__storybookElb;
const elbAtApply = elbAtApplyFrom(storyElb);

/**
 * Demo controls for a page story: persona and language in story state (a
 * persona switch only re-renders, nothing reloads), consent sent to the
 * addon's collector.
 */
export function useStoryControls(): DemoControls {
  const [persona, setPersona] = useState<PersonaKey>('anonymous');
  const [language, setLanguage] = useState<Language>('en');
  const consent = useDemoConsent(storyElb);

  return {
    persona,
    onPersonaSwitch: setPersona,
    language,
    onLanguageToggle: setLanguage,
    consent,
    elb: elbAtApply,
  };
}
