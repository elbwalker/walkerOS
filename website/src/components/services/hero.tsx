import React from 'react';
import Hero from '@site/src/components/organisms/hero';

export default function ServicesHero() {
  return (
    <Hero
      title={<div className="block text-elbwalker block">walkerOS</div>}
      subtitle="Professional services"
      text={
        <>
          Get strategy sparring, technical support, and help funding our
          development.
        </>
      }
      primaryButton={{
        link: 'https://calendly.com/elb-alexander/30min',
        children: 'Schedule call',
        elbAction: 'call',
      }}
      secondaryButton={{
        link: 'mailto:hello@elbwalker.com',
        children: 'Write us',
        elbAction: 'mail',
      }}
      elbTitle="services"
      badges={[
        'get robust and independent 1st party tracking',
        'get direct support from the creators',
        'help maintain and update library under MIT-licence',
      ]}
    />
  );
}
