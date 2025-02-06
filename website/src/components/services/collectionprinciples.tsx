import React from 'react';

type CollectionPrinciple = {
  // Changed to singular form
  name: string;
  description: string;
};

const collectionPrinciples: CollectionPrinciple[] = [
  // Changed to lowercase 'c'
  {
    name: 'Step-by-step',
    description:
      'While everyone can become an AI expert in no time, we should remember everything that has to be done before going there. It is a journey that requires lots of work from the ground up. No shortcuts.',
  },
  {
    name: 'Do not build on rented land',
    description:
      'In the ever-evolving world of data, relying solely on external platforms can be risky. Prioritize building your own robust data infrastructures to maintain control and adaptability. Sunsets are inevitable, also for features.',
  },
  {
    name: 'Resilience is key',
    description:
      'As data environments are dynamic, designing resilient systems can help withstand changes and unexpected challenges, ensuring continuous data flow and integrity. Yes, more legal requirements are coming.',
  },
  {
    name: 'Focus on what you can control',
    description:
      'In data management, focusing on elements within your control, like data quality and security, can lead to more reliable and effective outcomes. It is your responsibility and a great chance to set the rules.',
  },
  {
    name: 'Use tools only for what they are made for',
    description:
      'Utilize each data tool for its intended purpose to maximize efficiency and avoid unnecessary complications in data processes. No misusage.',
  },
  {
    name: 'Data is never done',
    description:
      'The journey of data is ongoing. Continuous analysis, refinement, and updating are crucial to keep data relevant and actionable. Build-measure-learn-grow.',
  },
  {
    name: 'Internalize data',
    description:
      'Embrace data as a core part of your strategy and operations. Integrating data into your processes ensures it becomes an intrinsic part of decision-making.',
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
            Seven principles we are following while working on data projects.
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
