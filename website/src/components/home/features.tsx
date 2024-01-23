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
          <Link to={link} className="text-black dark:text-white">{title}</Link>
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
          <Feature title="Collect" link="/docs/clients/" icon={iconCollect}>
            Capture events easily and privacy-compliant from your application or
            site with WalkerOS web or node.js clients.
          </Feature>
          <Feature title="Process" link="/docs/stacks/" icon={iconProcess}>
            Ingest your data to your own endpoint to ensure ownership and comply
            with legislation.
          </Feature>
          <Feature
            title="Activate"
            link="/docs/destinations/"
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
