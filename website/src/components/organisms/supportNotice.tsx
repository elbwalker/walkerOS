import React from 'react';
import Link from '@docusaurus/Link';

export default function SupportNotice(): JSX.Element {
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
        <strong>💡 Need Professional Support?</strong>
      </div>
      <div>
        If you need professional support with your walkerOS implementation,
        check out our{' '}
        <Link href="/services" target="_blank">
          services
        </Link>
        .
      </div>
    </div>
  );
}
