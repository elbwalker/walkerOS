import React from 'react';
import Hero from '@site/src/components/organisms/hero';

export default function HomeHero() {
  return (
    <Hero
      title="Tracking that passes code review"
      text="Get the same rigor for your analytics as your application code. Write in TypeScript. Review in GitHub. Catch errors before production."
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
        'Code reviewed and testable',
        'Self-hosted on your infrastructure',
      ]}
    />
  );
}
