import React from 'react';
import Link from '@docusaurus/Link';
import { tagger } from '@site/src/components/walkerjs';

export default function Features() {
  return (
    <div
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
      className="py-24 sm:py-32"
      {...tagger.entity('features').get()}
      {...tagger.action('visible', 'impression').get()}
      {...tagger.context('component', 'features').get()}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-base/7 font-semibold"
            style={{ color: 'var(--color-primary)' }}
          >
            Tracking-as-code
          </h2>
          <p
            className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ color: 'var(--color-base-content)' }}
          >
            Ship tracking as code, not in configuration UIs{' '}
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:mt-16 lg:grid-cols-3">
          {/* Feature 1: Composable Tagging */}
          <div className="relative">
            <div
              className="absolute inset-px rounded-lg"
              style={{ backgroundColor: 'var(--ifm-background-surface-color)' }}
            />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)]">
              <div className="px-8 pt-8 sm:px-10 sm:pt-10 min-h-[140px]">
                <p
                  className="mt-2 text-lg font-medium tracking-tight max-lg:text-center"
                  style={{ color: 'var(--color-base-content)' }}
                >
                  Composable tagging
                </p>
                <p
                  className="mt-2 max-w-lg text-sm/6 max-lg:text-center"
                  style={{ color: 'var(--color-gray-500)' }}
                >
                  Tag your entire application with simple HTML attributes—no
                  custom JavaScript required. Bake analytics into component
                  libraries once & scale.
                </p>
              </div>
              <div className="flex flex-1 items-start max-lg:pb-12 max-lg:pt-10 lg:pb-2 lg:pt-4">
                <div
                  className="w-full mx-6 rounded-lg shadow-xl outline outline-1 outline-white/10 overflow-hidden"
                  style={{ backgroundColor: 'var(--code-editor-bg)' }}
                >
                  <div
                    className="flex outline outline-1 outline-white/5"
                    style={{ backgroundColor: 'var(--code-editor-header-bg)' }}
                  >
                    <div
                      className="-mb-px flex text-sm/6 font-medium"
                      style={{ color: 'var(--code-editor-text-muted)' }}
                    >
                      <div
                        className="border-b border-r border-b-white/20 border-r-white/10 px-4 py-2"
                        style={{
                          backgroundColor: 'var(--code-editor-tab-active-bg)',
                          color: 'var(--code-editor-text)',
                        }}
                      >
                        ProductCard.tsx
                      </div>
                      <div className="border-r border-gray-600/10 px-4 py-2">
                        App.tsx
                      </div>
                    </div>
                  </div>
                  <div
                    className="px-6 pb-6 pt-6 text-xs overflow-auto max-h-[500px]"
                    style={{ color: 'var(--code-editor-text)' }}
                  >
                    <code className="block">
                      <span className="text-purple-400">import</span> {'{'}{' '}
                      tagger {'}'} <span className="text-purple-400">from</span>{' '}
                      <span className="text-green-400">'../walker'</span>;<br />
                      <br />
                      <span className="text-purple-400">function</span>{' '}
                      <span className="text-blue-400">ProductDetail</span>
                      {'({'}
                      <span className="text-yellow-400">
                        {'{'} product {'}'}
                      </span>
                      {') {'}
                      <br />
                      &nbsp;&nbsp;
                      <span className="text-purple-400">return</span> (<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;{'<'}
                      <span className="text-blue-400">div</span>
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'{'}
                      <span className="text-yellow-400">...tagger</span>()
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.
                      <span className="text-yellow-400">entity</span>(
                      <span className="text-green-400">'product'</span>)<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.
                      <span className="text-yellow-400">action</span>(
                      <span className="text-green-400">'load'</span>,{' '}
                      <span className="text-green-400">'view'</span>)<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.
                      <span className="text-yellow-400">data</span>(
                      <span className="text-green-400">'productId'</span>,
                      product.id)
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.
                      <span className="text-yellow-400">get</span>(){'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;{'>'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'<'}
                      <span className="text-blue-400">h1</span> {'{'}
                      <span className="text-yellow-400">...tagger</span>(
                      <span className="text-green-400">'product'</span>).
                      <span className="text-yellow-400">data</span>(
                      <span className="text-green-400">'name'</span>,
                      product.name).<span className="text-yellow-400">get</span>
                      (){'}'}
                      {'>'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'{'}
                      product.name{'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'</'}
                      <span className="text-blue-400">h1</span>
                      {'>'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'<'}
                      <span className="text-blue-400">button</span> {'{'}
                      <span className="text-yellow-400">...tagger</span>().
                      <span className="text-yellow-400">action</span>(
                      <span className="text-green-400">'click'</span>,{' '}
                      <span className="text-green-400">'add'</span>).
                      <span className="text-yellow-400">get</span>(){'}'}
                      {'>'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Add to
                      Cart
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'</'}
                      <span className="text-blue-400">button</span>
                      {'>'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;{'</'}
                      <span className="text-blue-400">div</span>
                      {'>'}
                      <br />
                      &nbsp;&nbsp;);
                      <br />
                      {'}'}
                    </code>
                  </div>
                </div>
              </div>
              <div className="px-8 pb-8 sm:px-10 sm:pb-10">
                <Link
                  to="/docs/sources/web/browser/tagging"
                  className="inline-flex items-center text-sm font-medium text-elbwalker hover:text-elbwalker-dark no-underline"
                >
                  Learn more about tagging →
                </Link>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow outline outline-1 outline-black/5 dark:outline-white/15" />
          </div>

          {/* Feature 2: Universal Event Transformation */}
          <div className="relative">
            <div
              className="absolute inset-px rounded-lg"
              style={{ backgroundColor: 'var(--ifm-background-surface-color)' }}
            />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)]">
              <div className="px-8 pt-8 sm:px-10 sm:pt-10 min-h-[140px]">
                <p
                  className="mt-2 text-lg font-medium tracking-tight max-lg:text-center"
                  style={{ color: 'var(--color-base-content)' }}
                >
                  Universal event transformation
                </p>
                <p
                  className="mt-2 max-w-lg text-sm/6 max-lg:text-center"
                  style={{ color: 'var(--color-gray-500)' }}
                >
                  Transform events once at the source, then again for each
                  destination. The same mapping syntax works everywhere—rename,
                  reshape, filter.
                </p>
              </div>
              <div className="flex flex-1 items-start max-lg:pb-12 max-lg:pt-10 lg:pb-2 lg:pt-4">
                <div
                  className="w-full mx-6 rounded-lg shadow-xl outline outline-1 outline-white/10 overflow-hidden"
                  style={{ backgroundColor: 'var(--code-editor-bg)' }}
                >
                  <div
                    className="flex outline outline-1 outline-white/5"
                    style={{ backgroundColor: 'var(--code-editor-header-bg)' }}
                  >
                    <div
                      className="-mb-px flex text-sm/6 font-medium"
                      style={{ color: 'var(--code-editor-text-muted)' }}
                    >
                      <div
                        className="border-b border-r border-b-white/20 border-r-white/10 px-4 py-2"
                        style={{
                          backgroundColor: 'var(--code-editor-tab-active-bg)',
                          color: 'var(--code-editor-text)',
                        }}
                      >
                        config.ts
                      </div>
                    </div>
                  </div>
                  <div
                    className="px-6 pb-6 pt-6 text-xs overflow-auto max-h-[500px]"
                    style={{ color: 'var(--code-editor-text)' }}
                  >
                    <code className="block">
                      <span className="text-gray-400">
                        // Source: Clean up what comes in
                      </span>
                      <br />
                      <span className="text-blue-400">sources</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;<span className="text-blue-400">browser</span>
                      : {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">config</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">mapping</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">product</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">click</span>: {'{'}{' '}
                      <span className="text-blue-400">name</span>:{' '}
                      <span className="text-green-400">'product view'</span>{' '}
                      {'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'},
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">test</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-green-400">'*'</span>: {'{'}{' '}
                      <span className="text-blue-400">ignore</span>:{' '}
                      <span className="text-yellow-400">true</span> {'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                      <br />
                      &nbsp;&nbsp;{'}'}
                      <br />
                      {'}'}
                      <br />
                      <br />
                      <span className="text-gray-400">
                        // Destination: Format for specific tools
                      </span>
                      <br />
                      <span className="text-blue-400">destinations</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;<span className="text-blue-400">
                        gtag
                      </span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">config</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">mapping</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">product</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">view</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">name</span>:{' '}
                      <span className="text-green-400">'view_item'</span>,<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">data</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">map</span>: {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">item_id</span>:{' '}
                      <span className="text-green-400">'data.id'</span>,<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">value</span>:{' '}
                      <span className="text-green-400">'data.price'</span>
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      {'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      {'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      {'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                      <br />
                      &nbsp;&nbsp;{'}'}
                      <br />
                      {'}'}
                    </code>
                  </div>
                </div>
              </div>
              <div className="px-8 pb-8 sm:px-10 sm:pb-10">
                <Link
                  to="/docs/mapping"
                  className="inline-flex items-center text-sm font-medium text-elbwalker hover:text-elbwalker-dark no-underline"
                >
                  Learn more about mapping →
                </Link>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow outline outline-1 outline-black/5 dark:outline-white/15" />
          </div>

          {/* Feature 3: Privacy-First Consent */}
          <div className="relative">
            <div
              className="absolute inset-px rounded-lg"
              style={{ backgroundColor: 'var(--ifm-background-surface-color)' }}
            />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)]">
              <div className="px-8 pt-8 sm:px-10 sm:pt-10 min-h-[140px]">
                <p
                  className="mt-2 text-lg font-medium tracking-tight max-lg:text-center"
                  style={{ color: 'var(--color-base-content)' }}
                >
                  Easy consent handling
                </p>
                <p
                  className="mt-2 max-w-lg text-sm/6 max-lg:text-center"
                  style={{ color: 'var(--color-gray-500)' }}
                >
                  Respect user privacy from the ground up. Queue events before
                  consent, process when granted, and handle race conditions
                  automatically.
                </p>
              </div>
              <div className="flex flex-1 items-start max-lg:py-6 lg:pb-2 lg:pt-4">
                <div
                  className="w-full mx-6 rounded-lg shadow-xl outline outline-1 outline-white/10 overflow-hidden"
                  style={{ backgroundColor: 'var(--code-editor-bg)' }}
                >
                  <div
                    className="flex outline outline-1 outline-white/5"
                    style={{ backgroundColor: 'var(--code-editor-header-bg)' }}
                  >
                    <div
                      className="-mb-px flex text-sm/6 font-medium"
                      style={{ color: 'var(--code-editor-text-muted)' }}
                    >
                      <div
                        className="border-b border-r border-b-white/20 border-r-white/10 px-4 py-2"
                        style={{
                          backgroundColor: 'var(--code-editor-tab-active-bg)',
                          color: 'var(--code-editor-text)',
                        }}
                      >
                        consent-setup.js
                      </div>
                    </div>
                  </div>
                  <div
                    className="px-6 pb-6 pt-6 text-xs overflow-auto max-h-[500px]"
                    style={{ color: 'var(--code-editor-text)' }}
                  >
                    <code className="block">
                      <span className="text-yellow-400">elb</span>(
                      <span className="text-green-400">'walker on'</span>,{' '}
                      <span className="text-green-400">'consent'</span>,
                      (instance, consent) =&gt; {'{'}
                      <br />
                      &nbsp;&nbsp;<span className="text-purple-400">
                        if
                      </span>{' '}
                      (consent.marketing) {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-yellow-400">gtag</span>(
                      <span className="text-green-400">'consent'</span>,{' '}
                      <span className="text-green-400">'update'</span>, {'{'}
                      <br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">ad_user_data</span>:{' '}
                      <span className="text-green-400">'granted'</span>,<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">
                        ad_personalization
                      </span>: <span className="text-green-400">'granted'</span>
                      ,<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">ad_storage</span>:{' '}
                      <span className="text-green-400">'granted'</span>,<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span className="text-blue-400">
                        analytics_storage
                      </span>: <span className="text-green-400">'granted'</span>
                      ,<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;{'}'});
                      <br />
                      &nbsp;&nbsp;{'}'}
                      <br />
                      {'}'});
                      <br />
                      <br />
                      <span className="text-gray-400">
                        // When CMP detects consent choice
                      </span>
                      <br />
                      <span className="text-yellow-400">elb</span>(
                      <span className="text-green-400">'walker consent'</span>,{' '}
                      {'{'} <span className="text-blue-400">functional</span>:{' '}
                      <span className="text-yellow-400">true</span>,{' '}
                      <span className="text-blue-400">marketing</span>:{' '}
                      <span className="text-yellow-400">false</span> {'}'});
                    </code>
                  </div>
                </div>
              </div>
              <div className="px-8 pb-8 sm:px-10 sm:pb-10">
                <Link
                  to="/docs/guides/consent/"
                  className="inline-flex items-center text-sm font-medium text-elbwalker hover:text-elbwalker-dark no-underline"
                >
                  Learn more about consent handling →
                </Link>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow outline outline-1 outline-black/5 dark:outline-white/15" />
          </div>
        </div>
      </div>
    </div>
  );
}
