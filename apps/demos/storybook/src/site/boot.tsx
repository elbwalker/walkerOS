import { StrictMode, useEffect, useState, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { useDemoConsent } from '../shared/consent';
import {
  elbAtApplyFrom,
  type DemoControls,
  type DemoPageProps,
} from '../shared/controls';
import type { Language } from '../shared/language';
import { StatusMessage } from '../shared/molecules/StatusMessage';
import {
  personaFromSearch,
  searchForPersona,
  type PersonaKey,
} from '../shared/personas';
import { currentElb, installElbQueue, loadWalkerJs } from './walkerjs';

/** Opens the page again with a new search; a persona switch is a reload. */
export type Navigate = (search: string) => void;

const reload: Navigate = (search) => {
  window.location.search = search;
};

// One getter for consent and ViewSource: both send through whatever
// `window.elb` is when they send, the queue first, walker.js's push after.
const pageElb = () => currentElb(window);
const elbAtApply = elbAtApplyFrom(pageElb);

interface DemoRootProps {
  Page: ComponentType<DemoPageProps>;
  persona: PersonaKey;
  navigate: Navigate;
}

function DemoRoot({ Page, persona, navigate }: DemoRootProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [walkerFailed, setWalkerFailed] = useState(false);
  const consent = useDemoConsent(pageElb, { persist: true });

  // After the first commit, so `data-elbuser` and the tagged elements are in
  // the DOM when walker.js runs.
  useEffect(() => {
    loadWalkerJs(document, () => setWalkerFailed(true));
  }, []);

  const controls: DemoControls = {
    persona,
    onPersonaSwitch: (key) =>
      navigate(searchForPersona(window.location.search, key)),
    language,
    onLanguageToggle: setLanguage,
    consent,
    elb: elbAtApply,
  };

  return (
    <>
      {walkerFailed && (
        <StatusMessage
          tone="danger"
          role="alert"
          className="justify-center border-b border-border bg-surface px-(--gutter) py-2"
        >
          walkerOS didn't load: this page sends no events.
        </StatusMessage>
      )}
      <Page controls={controls} />
    </>
  );
}

/**
 * Runs a demo page on the demo site: queues elb calls until walker.js runs,
 * takes the persona from `?user=`, keeps the language in state and loads
 * walker.js after the first render.
 */
export function bootDemo(
  Page: ComponentType<DemoPageProps>,
  rootElement: HTMLElement,
  navigate: Navigate = reload,
): void {
  installElbQueue(window);
  createRoot(rootElement).render(
    <StrictMode>
      <DemoRoot
        Page={Page}
        persona={personaFromSearch(window.location.search)}
        navigate={navigate}
      />
    </StrictMode>,
  );
}

/** The page's `#root`; an entry without one is a build mistake. */
export function pageRoot(doc: Document): HTMLElement {
  const element = doc.getElementById('root');
  if (!element) throw new Error('The demo page has no #root element.');
  return element;
}
