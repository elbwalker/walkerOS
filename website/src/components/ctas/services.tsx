import React from 'react';
import CTA from '@site/src/components/organisms/cta';

export default function CTAServices() {
  return (
    <CTA
      text={
        <>
          Let's make your tracking setup future-proof with{' '}
          <span className="inline text-elbwalker">walkerOS</span>
          <br />
        </>
      }
      primaryButton={{
        link: 'https://calendly.com/elb-alexander/30min',
        children: 'Schedule free call',
      }}
      secondaryButton={{
        link: 'mailto:hello@elbwalker.com',
        children: 'Write us',
      }}
      elbTitle="let's discuss"
    />
  );
}
