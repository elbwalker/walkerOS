import React from 'react';
import { Button } from '../atoms/buttons';

export default function CTAStart() {
  return (
    <div data-elb="cta" data-elbaction="visible:impression">
      <div className="mx-auto max-w-7xl py-12 px-4 text-center sm:px-6 lg:py-16 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span
            data-elb-cta={`title:start your trial`}
            className="block text-black dark:text-white"
          >
            Start your trial run of{' '}
            <span className="inline text-elbwalker">walkerOS</span> now
            <br />
            and see how easy it is to set up
          </span>
        </h2>
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
          <Button link="docs/">Learn more</Button>
        </div>
      </div>
    </div>
  );
}
