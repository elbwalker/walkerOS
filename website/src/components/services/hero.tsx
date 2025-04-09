import React from 'react';
import Hero from '@site/src/components/organisms/hero';
import { Check } from '@site/src/components/atoms/icons';

export default function ServicesHero() {
  return (
    <Hero
      title={<div className="block text-elbwalker block">walkerOS</div>}
      subtitle="Professional services"
      text={
        <>
          We help you set up and leverage walkerOS.
          <br />
          Go from tracking chaos to tracking excellence in record speed.
        </>
      }
      primaryButton={{
        link: 'https://calendly.com/elb-alexander/30min',
        children: 'Schedule free call',
      }}
      secondaryButton={{
        link: 'mailto:hello@elbwalker.com',
        children: 'Write an email',
      }}
      elbTitle="services hero section"
      badges={
        <>
          <Check>direct support from the creators</Check>
          <Check>initial setup in 5 days</Check>
          <Check>fully integrated into your infrastructure</Check>
        </>
      }
    />
  );
}
