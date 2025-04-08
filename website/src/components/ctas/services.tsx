import React from 'react';
import { Button } from '../atoms/buttons';

export default function CTAServices() {
  return (
    <div data-elb="cta" data-elbaction="visible:impression">
      <div className="mx-auto max-w-7xl py-12 px-4 text-center sm:px-6 lg:py-16 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span
            data-elb-cta={`title:start your trial`}
            className="block text-black dark:text-white"
          >
            Let's discuss how
            <span className="inline px-2 text-elbwalker">walkerOS</span>
            <br />
            can elevate your analytics.
          </span>
        </h2>
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
          <Button link="https://calendly.com/elb-alexander/30min">
            Schedule free call
          </Button>
          <Button link="mailto:hello@elbwalker.com" variant="secondary">
            Write us
          </Button>
        </div>
      </div>
    </div>
  );
}
