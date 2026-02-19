import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import { CodeBox } from '@walkeros/explorer';
import { tagger } from '@site/src/components/walkerjs';

const bundledCode = `{
  "flows": {
    "default": {
      "sources": {
        "browser": {
          "package": "@walkeros/web-source-browser",
          "config": { "settings": { "pageview": true } }
        }
      },
      "destinations": {
        "ga4": {
          "package": "@walkeros/web-destination-gtag",
          "config": {
            "settings": { "ga4": { "measurementId": "G-XXX" } }
          }
        }
      }
    }
  }
}`;

const integratedCode = `import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationGtag } from '@walkeros/web-destination-gtag';

const { elb } = await startFlow({
  sources: {
    browser: {
      code: sourceBrowser,
      config: { settings: { pageview: true } }
    }
  },
  destinations: {
    ga4: {
      code: destinationGtag,
      config: {
        settings: { ga4: { measurementId: 'G-XXX' } }
      }
    }
  },
});`;

export default function GettingStarted() {
  const [mode, setMode] = useState<'bundled' | 'integrated'>('bundled');

  return (
    <div
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
      className="py-24 sm:py-32"
      {...tagger.entity('getting-started')}
      {...tagger.action('visible:impression')}
      {...tagger.context('component', 'getting-started')}
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
            className="text-center text-lg/8 mb-6"
            style={{ color: 'var(--color-base-content)' }}
          >
            Choose your preferred operating mode
          </p>

          {/* Mode selector */}
          <div className="flex gap-4 mb-8 justify-center">
            <button
              onClick={() => setMode('bundled')}
              className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                mode === 'bundled'
                  ? 'bg-[#01b5e2] text-white'
                  : 'bg-transparent border border-gray-400 hover:border-[#01b5e2]'
              }`}
              style={
                mode !== 'bundled'
                  ? { color: 'var(--color-base-content)' }
                  : undefined
              }
            >
              Bundled
            </button>
            <button
              onClick={() => setMode('integrated')}
              className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                mode === 'integrated'
                  ? 'bg-[#01b5e2] text-white'
                  : 'bg-transparent border border-gray-400 hover:border-[#01b5e2]'
              }`}
              style={
                mode !== 'integrated'
                  ? { color: 'var(--color-base-content)' }
                  : undefined
              }
            >
              Integrated
            </button>
          </div>

          {/* Mode description */}
          <p
            className="text-center text-sm mb-6"
            style={{ color: 'var(--color-gray-500)' }}
          >
            {mode === 'bundled'
              ? 'Build a standalone script from JSON config with npx walkeros'
              : 'Import directly into your TypeScript application'}
          </p>

          {/* Code editor */}
          <CodeBox
            showTrafficLights
            tabs={[
              {
                id: 'file',
                label: mode === 'bundled' ? 'flow.json' : 'tracking.ts',
                code: mode === 'bundled' ? bundledCode : integratedCode,
                language: mode === 'bundled' ? 'json' : 'typescript',
              },
            ]}
            disabled
            autoHeight
            className="mx-auto shadow-2xl"
            style={{ maxWidth: '800px' }}
          />

          {/* Link to mode-specific docs */}
          <div className="text-center mt-10">
            <Link
              to={
                mode === 'bundled'
                  ? '/docs/getting-started/modes/bundled/'
                  : '/docs/getting-started/modes/integrated/'
              }
              className="text-lg font-semibold"
              style={{ color: 'var(--color-base-content)' }}
              {...tagger.action(
                `click:${mode === 'bundled' ? 'bundled-docs' : 'integrated-docs'}`,
              )}
            >
              {mode === 'bundled'
                ? 'Install walkerOS CLI'
                : 'Install npm packages'}{' '}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
