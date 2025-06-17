import React from 'react';
import Hero from '@site/src/components/organisms/hero';

export default function ServicesHero() {
  return (
    <Hero
      title={<div className="block text-elbwalker block">walkerOS</div>}
      subtitle="Professional services"
      text={
        <>
          We help you build and maintain a robust, independent tracking
          infrastructure.
        </>
      }
      primaryButton={{
        link: 'https://calendly.com/elb-alexander/30min',
        children: 'Schedule call',
        elbAction: 'call',
      }}
      secondaryButton={{
        link: 'mailto:hello@elbwalker.com',
        children: 'Send an email',
        elbAction: 'mail',
      }}
      elbTitle="services"
      badges={[
        'direct support from the creators',
        'prioritized Github issues',
        'help maintain and update library under MIT-licence',
      ]}
    />
  );
}
