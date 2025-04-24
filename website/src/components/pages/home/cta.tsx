import React from 'react';
import CTA from '@site/src/components/organisms/cta';

export default function CTAStart() {
  return (
    <CTA
      text={
        <>
          Start your trial run of{' '}
          <span className="inline text-elbwalker">walkerOS</span> now
          <br />
          and see how easy it is to set up.
        </>
      }
      primaryButton={{
        link: "/docs/",
        children: "Learn more"
      }}
    />
  );
}
