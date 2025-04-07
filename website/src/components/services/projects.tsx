import React from 'react';

import { CheckIcon } from '@heroicons/react/20/solid';

const includedFeatures = [
  'Measurement plan',
  'Implementation guidance',
  'Client- and server-side setup',
  'Ongoing training & development',
];

export default function Projects() {
  return (
    <div className="py-24 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-700 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
          <div className="p-8 sm:p-10 lg:flex-auto">
            <h3 className="text-3xl font-semibold tracking-tight text-white">
              Projects (5+ days)
            </h3>
            <p className="mt-6 text-base/7 text-gray-200">
              Partner with us to design and implement a robust pipeline for
              high-quality, privacy-friendly data. We're creating a solution
              tailored to your unique needs, ensuring long-term success.
            </p>
            <div className="mt-10 flex items-center gap-x-4">
              <h4 className="flex-none text-sm/6 font-semibold text-elbwalker-600">
                What's included
              </h4>
              <div className="h-px flex-auto bg-gray-800" />
            </div>
            <ul
              role="list"
              className="mt-8 grid grid-cols-1 gap-4 text-sm/6 text-gray-200 sm:grid-cols-2 sm:gap-6"
            >
              {includedFeatures.map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <CheckIcon
                    aria-hidden="true"
                    className="h-6 w-5 flex-none text-elbwalker-600"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:shrink-0">
            <div className="rounded-2xl bg-gray-800 py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
              <div className="mx-auto max-w-xs px-8">
                <p className="text-base font-semibold text-gray-200"></p>
                <p className="mt-6 flex items-baseline justify-center gap-x-2">
                  <span className="text-5xl font-semibold tracking-tight text-white">
                    Custom
                  </span>
                  <span className="text-sm/6 font-semibold tracking-wide text-gray-200">
                    EUR
                  </span>
                </p>
                <a
                  href="https://calendly.com/elb-alexander/30min"
                  className="mt-10 block w-full rounded-md bg-elbwalker-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-elbwalker-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-elbwalker-600"
                >
                  Schedule free call
                </a>
                <p className="mt-6 text-xs/5 text-gray-800">
                  Invoices and receipts available for easy company reimbursement
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
