import React from 'react';
import Link from '@docusaurus/Link';

export default function CompanyMission() {
  return (
    <div className="relative bg-gray-900 py-16 sm:py-24">
      <div className="lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-2 lg:items-start lg:gap-24 lg:px-8">
        <div className="relative sm:py-16 lg:py-0">
          <div
            aria-hidden="true"
            className="hidden sm:block lg:absolute lg:inset-y-0 lg:right-0 lg:w-screen"
          >
            <div className="absolute inset-y-0 right-1/2 w-full rounded-r-3xl bg-gray-800 lg:right-72" />
            <svg
              className="absolute top-8 left-1/2 -ml-3 lg:-right-8 lg:left-auto lg:top-12"
              width={404}
              height={392}
              fill="none"
              viewBox="0 0 404 392"
            >
              <defs>
                <pattern
                  id="02f20b47-fd69-4224-a62a-4c9de5c763f7"
                  x={0}
                  y={0}
                  width={20}
                  height={20}
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    x={0}
                    y={0}
                    width={4}
                    height={4}
                    className="text-gray-800"
                    fill="currentColor"
                  />
                </pattern>
              </defs>
              <rect
                width={404}
                height={392}
                fill="url(#02f20b47-fd69-4224-a62a-4c9de5c763f7)"
              />
            </svg>
          </div>
          <div className="relative mx-auto max-w-md px-4 sm:max-w-3xl sm:px-6 md:mt-2 lg:mt-2 lg:max-w-none lg:px-0 lg:py-20">
            <div className="relative mx-auto max-w-prose text-base lg:max-w-none">
              <img
                alt="elbwalker team"
                src={require('@site/static/img/company/team.jpg').default}
                className="rounded-lg object-cover object-center shadow-lg"
              />
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-md px-4 sm:max-w-3xl sm:px-6 lg:px-0">
          <div className="pt-12 sm:pt-16 lg:pt-20">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-50 sm:text-4xl">
              Our mission
            </h2>
            <div className="mt-6 space-y-6 text-gray-400">
              <div className="mx-auto max-w-prose text-base text-gray-50 lg:max-w-none">
                <h3>
                  Creating a new and open standard to measure user behavior.
                </h3>
              </div>
              <p className="text-base leading-7">
                We change the way companies collect data. To most organizations
                tracking implementation today is a highly error-prone downstream
                task that nobody likes. Most of the time there is no universal
                approach to it. It just grows historically and hysterically with
                the number of new marketing tools and product features. The lack
                of strategy and documentation creates data, that is neither
                reliable nor sustainable. It also makes it hard to govern data
                collection in terms of data privacy. We are committed to
                changing that and empowering companies of all sizes and
                industries to make decisions based on legitimate and reliable
                customer data
              </p>
              <p className="text-base leading-7">
                We are into data and analytics engineering. Are you too? Then
                write us at{' '}
                <a href="mailto:work@elbwalker.com">work@elbwalker.com</a>.
                We're happy if we can inspire you to be part of our journey.
                Perhaps the further information will help you with your
                decision.
              </p>
              <p>
                <Link
                  to="/docs/"
                  className="text-base font-medium text-elbwalker-600"
                >
                  Learn more about our software
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
