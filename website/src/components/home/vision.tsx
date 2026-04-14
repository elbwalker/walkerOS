import React from 'react';
import { tagger } from '@site/src/components/walkerjs';

const blocks = [
  {
    title: 'Own your data',
    description:
      'Your events, your infrastructure, your rules. walkerOS runs on your servers so behavioral data never touches a third-party system by default — giving you full control over privacy, compliance, and what gets collected.',
  },
  {
    title: 'Switch tools without pain',
    description:
      'The collector sits between your tracking code and every analytics or marketing tool you use. Add, swap, or remove a destination in config — no re-instrumentation, no rework, no dependency on any vendor.',
  },
];

export default function Vision() {
  return (
    <div
      {...tagger.entity('vision')}
      {...tagger.action('visible:impression')}
      {...tagger.context('component', 'vision')}
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
      className="py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2
          className="text-3xl font-semibold tracking-tight sm:text-4xl text-center mb-12"
          style={{ color: 'var(--color-base-content)' }}
        >
          Why walkerOS
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 max-w-4xl mx-auto">
          {blocks.map((block) => (
            <div
              key={block.title}
              className="rounded-2xl p-8"
              style={{ border: '1px solid rgba(128,128,128,0.2)' }}
            >
              <h3
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--color-base-content)' }}
              >
                {block.title}
              </h3>
              <p
                className="text-base leading-7"
                style={{ color: 'var(--color-gray-500)' }}
              >
                {block.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
