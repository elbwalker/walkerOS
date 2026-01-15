import React from 'react';
import Link from '@docusaurus/Link';
import { CodeBox } from '@walkeros/explorer';
import { tagger } from '@site/src/components/walkerjs';

const composableTaggingCode = `import { tagger } from '../walker';

function ProductDetail({ product }) {
  return (
    <div
      {...tagger()
        .entity('product')
        .action('load', 'view')
        .data('productId', product.id)
        .get()}
    >
      <h1 {...tagger('product').data('name', product.name).get()}>
        {product.name}
      </h1>
      <button {...tagger().action('click', 'add').get()}>
        Add to Cart
      </button>
    </div>
  );
}`;

const transformationCode = `// Source: Clean up what comes in
sources: {
  browser: {
    config: {
      mapping: {
        product: {
          click: { name: 'product view' }
        },
        test: {
          '*': { ignore: true }
        }
      }
    }
  }
}

// Destination: Format for specific tools
destinations: {
  gtag: {
    config: {
      mapping: {
        product: {
          view: {
            name: 'view_item',
            data: {
              map: {
                item_id: 'data.id',
                value: 'data.price'
              }
            }
          }
        }
      }
    }
  }
}`;

const consentCode = `elb('walker on', 'consent', (instance, consent) => {
  if (consent.marketing) {
    gtag('consent', 'update', {
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      ad_storage: 'granted',
      analytics_storage: 'granted',
    });
  }
});

// When CMP detects consent choice
elb('walker consent', { functional: true, marketing: false });`;

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
                  Tag your entire application with simple HTML attributes. No
                  custom JavaScript required. Bake analytics into component
                  libraries once & scale.
                </p>
              </div>
              <div className="flex flex-1 items-start max-lg:pb-12 max-lg:pt-10 lg:pb-2 lg:pt-4">
                <CodeBox
                  tabs={[
                    {
                      id: 'product',
                      label: 'ProductCard.tsx',
                      code: composableTaggingCode,
                      language: 'typescript',
                    },
                  ]}
                  disabled
                  className="w-full mx-6 shadow-xl"
                />
              </div>
              <div className="px-8 pb-8 sm:px-10 sm:pb-10">
                <Link
                  to="/docs/sources/web/browser/tagging/html-attributes"
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
                  destination. The same mapping syntax works everywhere: rename,
                  reshape, filter.
                </p>
              </div>
              <div className="flex flex-1 items-start max-lg:pb-12 max-lg:pt-10 lg:pb-2 lg:pt-4">
                <CodeBox
                  tabs={[
                    {
                      id: 'config',
                      label: 'config.ts',
                      code: transformationCode,
                      language: 'typescript',
                    },
                  ]}
                  disabled
                  className="w-full mx-6 shadow-xl"
                />
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
                <CodeBox
                  tabs={[
                    {
                      id: 'consent',
                      label: 'consent-setup.js',
                      code: consentCode,
                      language: 'javascript',
                    },
                  ]}
                  disabled
                  className="w-full mx-6 shadow-xl"
                />
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
