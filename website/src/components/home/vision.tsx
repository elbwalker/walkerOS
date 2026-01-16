import React from 'react';
import { tagger } from '@site/src/components/walkerjs';

export default function Vision() {
  return (
    <div
      {...tagger.entity('vision')}
      {...tagger.action('visible:impression')}
      {...tagger.context('component', 'vision')}
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
    >
      <div className="px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2
            className="text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ color: 'var(--color-base-content)' }}
          >
            Enabling the <span className="text-elbwalker">next generation</span>{' '}
            of MarTech developers
          </h2>
        </div>
      </div>
    </div>
  );
}
