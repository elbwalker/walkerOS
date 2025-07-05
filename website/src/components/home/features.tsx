import { JSX } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import {
  CircleStackIcon,
  PresentationChartBarIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import Link from '@docusaurus/Link';

type FeatureItem = {
  title: string;
  link: string;
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
  const iconCollect = (
    <TagIcon className="h-12 w-12 text-elbwalker" aria-hidden="true" />
  );
  const iconProcess = (
    <CircleStackIcon className="h-12 w-12 text-elbwalker" aria-hidden="true" />
  );
  const iconActivate = (
    <PresentationChartBarIcon
      className="h-12 w-12 text-elbwalker"
      aria-hidden="true"
    />
  );

  return (
    <section className="my-20">
      <div className="container">
        <div className="row">
          <Feature title="Collect" link="/docs/sources" icon={iconCollect}>
            Capture events easily and privacy-compliant from your app or site
            with web and server sources.
          </Feature>
          <Feature
            title="Handle consent"
            link="/docs/consent_management/commands"
            icon={iconProcess}
          >
            Implement and manage consent to ensure user privacy and comply with
            legislation.
          </Feature>
          <Feature
            title="Distribute"
            link="/docs/destinations"
            icon={iconActivate}
          >
            Feed you 3rd party analytics and marketing tools with reliable and
            rich event data.
          </Feature>
        </div>
      </div>
    </section>
  );
}
