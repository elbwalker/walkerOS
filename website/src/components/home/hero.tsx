import React from 'react';
import Hero from '@site/src/components/organisms/hero';

export default function HomeHero() {
  return (
    <Hero
      title={<div className="block text-elbwalker block">walkerOS</div>}
      subtitle="Open-source event data collection"
      text="Collect event data for digital analytics in a unified and privacy-centric way."
      primaryButton={{
        link: '/docs/',
        children: 'Getting started',
        elbAction: 'start',
      }}
      secondaryButton={{
        link: 'https://www.elbwalker.com/services',
        children: 'Services',
        elbAction: 'services',
      }}
      elbTitle="home"
      badges={[
        'runs in your own infrastructure',
        'integrates with all analytics & marketing tools',
        'in-built consent mode',
      ]}
    />
  );
}
