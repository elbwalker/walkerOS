import React from 'react';
import Hero from '@site/src/components/organisms/hero';

export default function HomeHero() {
  return (
    <Hero
      title="Open-source data collection and tag management"
      text="Collect and route event data with full control. Privacy-first, vendor-free, and built for developers."
      primaryButton={{
        link: '/docs/',
        children: 'Get started',
        elbAction: 'start',
      }}
      secondaryButton={{
        link: 'https://github.com/elbwalker/walkerOS',
        children: 'View on GitHub',
        elbAction: 'github',
      }}
      elbTitle="home"
      badges={[
        'Version controlled in Git',
        'Self-hosted on your infrastructure',
        'No vendor lock-in',
      ]}
    />
  );
}
