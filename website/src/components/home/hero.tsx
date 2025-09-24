import React from 'react';
import Hero from '@site/src/components/organisms/hero';

export default function HomeHero() {
  return (
    <Hero
      title={<div className="block text-elbwalker block">walkerOS</div>}
      subtitle="Open-source tag management for developers"
      text="Debug with confidence, collaborate without friction, and stay fully in control of your data."
      primaryButton={{
        link: '/docs/',
        children: 'Getting started',
        elbAction: 'start',
      }}
      secondaryButton={{
        link: '/services',
        children: 'Services',
        elbAction: 'services',
      }}
      elbTitle="home"
      badges={['client- & server-side', 'Git-native', 'MIT-licenced']}
    />
  );
}
