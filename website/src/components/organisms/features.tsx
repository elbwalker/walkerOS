import React from 'react';
import Link from '@docusaurus/Link';
import { CodeBox } from '@walkeros/explorer';
import { tagger } from '@site/src/components/walkerjs';

const composableTaggingHtmlCode = `<div
  data-elb="product"
  data-elb-product="id:123;name:Sneakers"
  data-elbaction="load:view"
>
  <h1 data-elb-product="name">Sneakers</h1>
  <button data-elbaction="click:add">
    Add to Cart
  </button>
</div>`;

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

const webCode = `// Capture GA4 dataLayer events
{
  sources: {
    dataLayer: {
      config: {
        mapping: {
          add_to_cart: {
            name: 'product add',
            data: {
              map: {
                id: 'items.0.item_id',
                name: 'items.0.item_name',
                price: 'value'
              }
            }
          }
        }
      }
    }
  }
}`;

const serverCode = `// GET /collect?event=addToCart&data[itemId]=123&data[itemName]=Sneakers&data[amount]=49.99
{
  sources: {
    express: {
      config: {
        mapping: {
          addToCart: {
            name: 'product add',
            data: {
              map: {
                id: 'data.itemId',
                name: 'data.itemName',
                price: 'data.amount'
              }
            }
          }
        }
      }
    }
  }
}`;

const flowJsonCode = `{
  destinations: {
    ga4: {
      config: {
        consent: { marketing: true },
        loadScript: false,
        settings: {
          measurementId: 'G-XXXXXXXXXX'
        }
      }
    }
  }
}`;

const cmpCode = `// When CMP detects user's consent choice
elb('walker consent', { marketing: true });`;

const gtagCode = `// Handled automatically:

// No scripts loaded until consent
// gtag('consent', 'default', {...})
// gtag('consent', 'update', {...})

// Full Consent Mode v2 support
// Zero additional code needed`;

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
                      id: 'html',
                      label: 'product.html',
                      code: composableTaggingHtmlCode,
                      language: 'html',
                    },
                    {
                      id: 'product',
                      label: 'ProductDetail.tsx',
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
                      id: 'web',
                      label: 'web.ts',
                      code: webCode,
                      language: 'typescript',
                    },
                    {
                      id: 'server',
                      label: 'server.ts',
                      code: serverCode,
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
                      id: 'flow',
                      label: 'flow.json',
                      code: flowJsonCode,
                      language: 'json',
                    },
                    {
                      id: 'cmp',
                      label: 'cmp.js',
                      code: cmpCode,
                      language: 'javascript',
                    },
                    {
                      id: 'gtag',
                      label: 'gtag.js',
                      code: gtagCode,
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
