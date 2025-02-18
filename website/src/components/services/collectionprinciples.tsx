import React from 'react';

type CollectionPrinciple = {
  // Changed to singular form
  name: string;
  description: string;
};

const collectionPrinciples: CollectionPrinciple[] = [
  // Changed to lowercase 'c'
  {
    name: 'Do not build on rented land',
    description:
      'In the ever-evolving world of data, relying solely on external platforms is risky. Prioritize building your own robust data infrastructure to maintain control and adaptability. Sunsets are inevitable — even for features.',
  },
  {
    name: 'Step-by-step',
    description:
      'While anyone can become an AI expert in no time, it is essential to remember the groundwork required to get there. Data development is a journey that demands effort from the ground up. No shortcuts.',
  },
  {
    name: 'Use tools only for what they are made for',
    description:
      'Utilize each data tool for its intended purpose to maximize efficiency and avoid unnecessary complications. Misusage leads to inefficiencies and potential risks.',
  },
  {
    name: 'Focus on what you can control',
    description:
      'In data management, focusing on factors within your control, like data quality and security, can lead to more reliable and effective outcomes. It is your responsibility and a huge opportunity to set the rules.',
  },
  {
    name: 'Internalize data',
    description:
      'Treat data as a fundamental part of your strategy and operations. By fully integrating it into your processes, data becomes intrinsic to decision-making.',
  },
  {
    name: 'Data is never done',
    description:
      'The data journey is ongoing. Continuous analysis, refinement, and updates are essential to keeping data relevant and actionable. Build. Measure. Learn. Grow.',
  },
  {
    name: 'Resilience is key',
    description:
      'Data environments are dynamic. Designing resilient systems ensures they can withstand changes and unexpected challenges while maintaining continuous data flow and integrity. And yes, probably more legal requirements are coming.',
  },
];

export default function CollectionPrinciples() {
  // Changed component name to PascalCase
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Data collection principles{' '}
          </h2>
          <p className="mt-6 text-lg/8 text-gray-50">
            Seven principles we follow when working on data projects.
          </p>
        </div>
        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 text-base/7 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {collectionPrinciples.map(
            (
              principle, // Used lowercase variable
            ) => (
              <div key={principle.name}>
                <dt className="font-semibold text-gray-50">{principle.name}</dt>
                <dt className="mt-1 text-gray-300">{principle.description}</dt>
              </div>
            ),
          )}
        </dl>
      </div>
    </div>
  );
}
