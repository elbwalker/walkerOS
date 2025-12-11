import React from 'react';
import Link from '@docusaurus/Link';

export default function SupportNotice(): React.JSX.Element {
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
        Need professional support with your walkerOS implementation? Check out
        our{' '}
        <Link href="https://www.elbwalker.com/services" target="_blank">
          services
        </Link>
        .
      </div>
    </div>
  );
}
