import React from 'react';
import CTA from '@site/src/components/organisms/cta';

export default function CTAStart() {
  return (
    <CTA
      text={
        <>
          Get started with{' '}
          <span className="inline text-elbwalker">walkerOS</span> now
        </>
      }
      primaryButton={{
        link: '/docs/getting_started/quick_start',
        children: 'Quickstart',
      }}
      secondaryButton={{
        link: 'https://calendly.com/elb-alexander/30min',
        children: 'Request demo',
      }}
    />
  );
}
