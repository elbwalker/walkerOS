import { JSX } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import {
  PresentationChartBarIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

import Link from '@docusaurus/Link';

type FeatureItem = {
  title: string;
  link?: string;
  icon: JSX.Element;
  children: React.ReactNode;
};

function Feature({ title, link, icon, children }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">{icon}</div>
      <div className="text--center padding-horiz--md mt-2">
        <Heading as="h3">
          <Link to={link} className="text-black dark:text-white">
            {title}
          </Link>
        </Heading>
        <p>{children}</p>
      </div>
    </div>
  );
}

export default function Features(): JSX.Element {
  const iconMeasurementplan = (
    <PresentationChartBarIcon
      className="h-12 w-12 text-elbwalker"
      aria-hidden="true"
    />
  );
  const iconSetup = (
    <CodeBracketIcon className="h-12 w-12 text-elbwalker" aria-hidden="true" />
  );
  const iconExperts = (
    <RocketLaunchIcon className="h-12 w-12 text-elbwalker" aria-hidden="true" />
  );

  return (
    <section className="my-20">
      <div className="container">
        <div className="row">
          <Feature title="Measurement plan" icon={iconMeasurementplan}>
            We'll work with your team to blend your current tracking setup with
            our proven best practices for measuring user behavior.
          </Feature>
          <Feature title="Technical setup" icon={iconSetup}>
            Whether it's implementing walker.js, or setting up server-side data
            collection, we'll tailor our support to your needs.
          </Feature>
          <Feature title="Ongoing support" icon={iconExperts}>
            Stay connected with us beyond the initial implementation. Through
            weekly check-ins, we'll help you refine, and expand your tracking
            setup.
          </Feature>
        </div>
      </div>
    </section>
  );
}
