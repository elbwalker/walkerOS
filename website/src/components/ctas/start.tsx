import React from 'react';
import Link from '@docusaurus/Link';
import { Button } from '../atoms/buttons';

export default function CTAStart({ position }) {
  const title = 'Scale your tracking implementation with walkerOS';

  return (
    <div
      data-elb="cta"
      data-elbaction="visible:impression"
      data-elb-cta={`position:${position}`}
    >
      <div className="mx-auto max-w-7xl py-12 px-4 text-center sm:px-6 lg:py-16 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="block text-elbwalker-600">Ready to dive in?</span>
          <span
            data-elb-cta={`title:${title}`}
            className="block text-black dark:text-white"
          >
            {title}
          </span>
        </h2>
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
          <Button link="docs/">
            About
            <br />
            walkerOS
          </Button>
          <Button link="docs/walkeros/event-model/" isSecondary>
            Event
            <br />
            Model
          </Button>
        </div>
      </div>
    </div>
  );
}
