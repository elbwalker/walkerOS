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
  link: string;
  icon: JSX.Element;
  children: React.ReactNode;
};

function Principle({ title, link, icon, children }: FeatureItem) {
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

export default function Principles(): JSX.Element {
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
          <Feature title="Measurement plan meeting" icon={iconMeasurementplan}>
            We'll work with your team to blend your current tracking setup with
            our proven best practices for measuring user behavior. Together
            we'll define the events to track.
          </Feature>
          <Feature title="Setup support" icon={iconSetup}>
            Whether it's implementing walker.js, managing consent handling, or
            setting up server-side data collection using Google Cloud Platform
            and BigQuery, we'll tailor our support to your needs.
          </Feature>
          <Feature title="Ongoing support" icon={iconExperts}>
            Stay connected with the elbwalker team through bi-weekly check-ins
            after your initial setup. Access our developers to address
            production-related challenges.
          </Feature>
        </div>
      </div>
    </section>
  );
}
