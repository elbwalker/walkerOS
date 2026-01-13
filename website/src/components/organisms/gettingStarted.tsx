import React, { useState } from 'react';
import Link from '@docusaurus/Link';
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
  run: true
});`;

export default function GettingStarted() {
  const [mode, setMode] = useState<'bundled' | 'integrated'>('bundled');

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

          {/* Code editor mockup */}
          <div
            className="mx-auto rounded-2xl shadow-2xl outline outline-1 outline-white/10 overflow-hidden"
            style={{
              backgroundColor: 'var(--code-editor-bg)',
              maxWidth: '800px',
            }}
          >
            {/* Editor header with dots and tabs */}
            <div
              className="flex items-center outline outline-1 outline-white/5"
              style={{ backgroundColor: 'var(--code-editor-header-bg)' }}
            >
              {/* Traffic light dots */}
              <div className="flex items-center gap-2 px-4">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              {/* File tab */}
              <div
                className="-mb-px flex text-sm font-medium"
                style={{ color: 'var(--code-editor-text-muted)' }}
              >
                <div
                  className="border-b border-r border-b-white/20 border-r-white/10 px-4 py-2"
                  style={{
                    backgroundColor: 'var(--code-editor-tab-active-bg)',
                    color: 'var(--code-editor-text)',
                  }}
                >
                  {mode === 'bundled' ? 'flow.json' : 'tracking.ts'}
                </div>
              </div>
            </div>

            {/* Code content */}
            <div className="px-6 py-6 font-mono text-sm overflow-x-auto">
              <pre style={{ color: 'var(--code-editor-text)', margin: 0 }}>
                <code>{mode === 'bundled' ? bundledCode : integratedCode}</code>
              </pre>
            </div>
          </div>

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
              {...tagger
                .action(
                  'click',
                  mode === 'bundled' ? 'bundled-docs' : 'integrated-docs',
                )
                .get()}
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
