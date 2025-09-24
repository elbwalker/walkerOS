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
          <Feature
            title="Deterministic approach"
            link="/docs/sources"
            icon={iconCollect}
          >
            Every rule is code you can read, test, and deploy.
          </Feature>
          <Feature
            title="Dev-first workflow"
            link="/docs/guides/consent/"
            icon={iconProcess}
          >
            Version control, CI/CD, and code reviews built-in.
          </Feature>
          <Feature
            title="Full data ownership"
            link="/docs/destinations"
            icon={iconActivate}
          >
            Data collection and logic fully stays within your codebase and
            infrastructure.
          </Feature>
        </div>
      </div>
    </section>
  );
}
