import React from 'react';
import { Button } from '../atoms/buttons';

export default function CTAStart() {
  return (
    <div
      data-elb="cta"
      data-elbaction="visible:impression"
    >
      <div className="mx-auto max-w-7xl py-12 px-4 text-center sm:px-6 lg:py-16 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span
            data-elb-cta={`title:#innerHTML`}
            className="block text-black dark:text-white"
          >
            Start your trial run of
            <span className="inline px-2 text-elbwalker-600">walkerOS</span> now
            <br />
            and see how easy it is to set up
          </span>
        </h2>
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
          <Button link="docs/">
            About
            <br />
            walkerOS
          </Button>
          <Button link="https://calendly.com/elb-alexander/30min" isSecondary>
            Learn
            <br />
            more
          </Button>
        </div>
      </div>
    </div>
  );
}
