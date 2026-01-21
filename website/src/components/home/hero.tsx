import React from 'react';
import Hero from '@site/src/components/organisms/hero';

export default function HomeHero() {
  return (
    <Hero
      title="Open-source data collection and tag management"
      text="Collect and route your behavioral data with full control and ownership. Privacy-first, vendor-free, and built for developers."
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
        'Self-host on your infrastructure',
        'Config-as-code',
        'Version control in Git',
        'MIT-licensed',
      ]}
    />
  );
}
