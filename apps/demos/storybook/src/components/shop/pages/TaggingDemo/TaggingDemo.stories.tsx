import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Elb, WalkerOS } from '@walkeros/core';
import type { SourceBrowser } from '@walkeros/web-source-browser';
import { TaggingDemo } from './TaggingDemo';
import type { ConsentState } from '../../organisms/ConsentBar';
import { useDemoProducts } from '../../useDemoProducts';

// The Storybook addon starts the collector in the preview and exposes its
// browser source's elb here. It is missing until the addon has started (or
// when it failed to).
declare global {
  interface Window {
    __storybookElb?: SourceBrowser.Push;
  }
}

const notRunning = 'Not sent: walkerOS is not running in this preview.';

// The static demo's consent simulation sends exactly these commands.
async function sendAccept(
  elb: WalkerOS.Elb,
  userId: string,
): Promise<Elb.PushResult[]> {
  return [
    await elb('walker user', { id: userId }),
    await elb('walker consent', { functional: true, marketing: true }),
  ];
}

async function sendDeny(elb: WalkerOS.Elb): Promise<Elb.PushResult[]> {
  return [
    await elb('walker user', {
      id: 'anonymous',
      device: undefined,
      session: undefined,
    }),
    await elb('walker consent', { functional: true, marketing: false }),
  ];
}

// The addon sets window.__storybookElb when it has started, after the page's
// first render. So the page gets this stable function, which looks the elb up
// at the moment an edit is applied.
const elbAtApply: SourceBrowser.Push = (
  ...args: Parameters<SourceBrowser.BrowserArguments>
) => {
  const elb = window.__storybookElb;
  return elb
    ? elb(...args)
    : Promise.resolve({
        ok: false,
        error: 'walkerOS is not running in this preview.',
      });
};

// The page with the static demo's behaviour: consent state and the user id
// live in story state, "Add product" appends from the demo catalog.
const ConnectedTaggingDemo = () => {
  const [consentState, setConsentState] = useState<ConsentState>('unknown');
  const [consentNotice, setConsentNotice] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const [products, addProduct] = useDemoProducts();
  // Only the latest choice may report: an earlier send that settles late
  // must not overwrite the notice of a later one.
  const attemptRef = useRef(0);

  const applyConsent = (granted: boolean) => {
    setConsentState(granted ? 'accepted' : 'denied');
    const attempt = ++attemptRef.current;
    const elb = window.__storybookElb;
    if (!elb) {
      setConsentNotice(notRunning);
      return;
    }
    setConsentNotice(undefined);

    let sent: Promise<Elb.PushResult[]>;
    if (granted) {
      const id = userId ?? Math.random().toString(36).slice(2, 7);
      setUserId(id);
      sent = sendAccept(elb, id);
    } else {
      sent = sendDeny(elb);
    }

    sent
      .then((results) => {
        if (attempt !== attemptRef.current) return;
        const failed = results.find((result) => !result.ok);
        if (failed)
          setConsentNotice(
            `Not sent: ${failed.error ?? 'walkerOS rejected the command.'}`,
          );
      })
      .catch((error: unknown) => {
        if (attempt !== attemptRef.current) return;
        setConsentNotice(
          `Not sent: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  };

  return (
    <TaggingDemo
      consentState={consentState}
      consentNotice={consentNotice}
      onConsentAccept={() => applyConsent(true)}
      onConsentDeny={() => applyConsent(false)}
      onConsentReset={() => {
        // As in the static demo, a reset forgets the choice and sends nothing.
        attemptRef.current += 1;
        setConsentState('unknown');
        setConsentNotice(undefined);
      }}
      products={products}
      onAddProduct={addProduct}
      elb={elbAtApply}
    />
  );
};

// No autodocs: the page is one long story with a pinned consent bar.
const meta: Meta = {
  title: 'Shop/Pages/Tagging demo',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: 'Tagging demo',
  render: () => <ConnectedTaggingDemo />,
};
