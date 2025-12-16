import React from 'react';
import Link from '@docusaurus/Link';
import { tagger } from '@site/src/components/walkerjs';

export default function GettingStarted() {
  return (
    <div
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
      className="py-24 sm:py-32"
      {...tagger.entity('getting-started').get()}
      {...tagger.action('visible', 'impression').get()}
      {...tagger.context('component', 'getting-started').get()}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Headline */}
          <h2
            className="text-center text-4xl font-semibold tracking-tight sm:text-5xl mb-6"
            style={{ color: 'var(--color-primary)' }}
          >
            Getting started with walkerOS
          </h2>

          {/* Description */}
          <p
            className="text-center text-lg/8 mb-10"
            style={{ color: 'var(--color-base-content)' }}
          >
            Install from npm and start tracking in minutes
          </p>

          {/* Terminal mockup */}
          <div
            className="mx-auto rounded-2xl shadow-2xl outline outline-1 outline-white/10 overflow-hidden"
            style={{
              backgroundColor: 'var(--code-editor-bg)',
              maxWidth: '800px',
            }}
          >
            {/* Terminal header with dots */}
            <div
              className="flex items-center gap-2 px-4 py-3 outline outline-1 outline-white/5"
              style={{ backgroundColor: 'var(--code-editor-header-bg)' }}
            >
              <div className="flex gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#ff5f56' }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#ffbd2e' }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#27c93f' }}
                />
              </div>
            </div>

            {/* Terminal content */}
            <div className="px-6 py-8 font-mono text-sm">
              <code>
                <span style={{ color: 'var(--code-editor-text)' }}>
                  npx walkeros
                </span>
              </code>
            </div>
          </div>

          {/* Link to quickstart */}
          <div className="text-center mt-10">
            <Link
              to="/docs/getting-started/quickstart/"
              className="text-lg font-semibold"
              style={{ color: 'var(--color-base-content)' }}
              {...tagger.action('click', 'quickstart').get()}
            >
              See full Quickstart guide <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
