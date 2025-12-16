import React from 'react';
import CTA from '@site/src/components/organisms/cta';

export default function CTAStart() {
  return (
    <CTA
      title={
        <>
          A project by <span className="inline text-elbwalker">elbwalker</span>
        </>
      }
      description="We are a team of passionate developers and analysts based in Hamburg"
      primaryButton={{
        link: 'https://www.elbwalker.com',
        children: 'About us',
      }}
      secondaryButton={{
        link: 'https://calendly.com/elb-alexander/30min',
        children: 'Request demo',
      }}
    />
  );
}
