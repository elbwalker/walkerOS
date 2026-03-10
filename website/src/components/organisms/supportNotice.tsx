import React from 'react';
import Link from '@docusaurus/Link';
import { useDoc } from '@docusaurus/plugin-content-docs/client';

const CALENDLY_URL = 'https://calendly.com/elb-alexander/30min';

type ContextualMessage = {
  heading: string;
  body: React.ReactNode;
};

function getContextualMessage(docId: string): ContextualMessage {
  if (docId.startsWith('comparisons/')) {
    return {
      heading: 'Migrating from an existing setup?',
      body: (
        <>
          We have done these migrations before. The elbwalker team can review
          your current setup and build a migration plan with you.{' '}
          <Link href={CALENDLY_URL} target="_blank">
            Start with a free scoping call.
          </Link>
        </>
      ),
    };
  }

  if (docId === 'mapping') {
    return {
      heading: 'Need help mapping your events?',
      body: (
        <>
          Getting GA4, Meta, or custom destination mappings right for complex
          e-commerce setups is exactly what our consulting calls are for.{' '}
          <Link href={CALENDLY_URL} target="_blank">
            Start with a free scoping call.
          </Link>
        </>
      ),
    };
  }

  if (docId.startsWith('getting-started/modes')) {
    return {
      heading: 'Not sure which mode fits your stack?',
      body: (
        <>
          We are happy to talk through your architecture and recommend the right
          approach.{' '}
          <Link href={CALENDLY_URL} target="_blank">
            Start with a free scoping call.
          </Link>
        </>
      ),
    };
  }

  if (docId.startsWith('getting-started/quickstart')) {
    return {
      heading: 'Setting this up for production?',
      body: (
        <>
          If your setup involves consent management, server-side pipelines, or
          custom destinations, the creators of walkerOS offer hands-on
          implementation support.{' '}
          <Link href={CALENDLY_URL} target="_blank">
            Start with a free scoping call.
          </Link>
        </>
      ),
    };
  }

  return {
    heading: 'Need implementation support?',
    body: (
      <>
        elbwalker offers hands-on support: setup review, measurement planning,
        destination mapping, and live troubleshooting.{' '}
        <Link href={CALENDLY_URL} target="_blank">
          Book a 2-hour session (€399)
        </Link>
      </>
    ),
  };
}

export default function SupportNotice(): React.JSX.Element {
  const { metadata } = useDoc();
  const { heading, body } = getContextualMessage(metadata.id);

  return (
    <div
      className="alert alert--info"
      style={{
        marginTop: '2rem',
        marginBottom: '1rem',
        borderLeft: '4px solid var(--ifm-color-info)',
        padding: '1rem',
      }}
    >
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>💡 {heading}</strong>
      </div>
      <div>{body}</div>
    </div>
  );
}
