import React, { ReactNode } from 'react';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import Link from '@docusaurus/Link';
import { Icon } from '@iconify/react';
import { Check } from '@site/src/components/atoms/icons';
import { tagger } from '@site/src/components/walkerjs';

interface HeroButton {
  link: string;
  children: ReactNode;
  elbAction?: string;
}

interface HeroProps {
  title: ReactNode;
  subtitle?: ReactNode;
  text?: ReactNode;
  primaryButton?: HeroButton;
  secondaryButton?: HeroButton;
  elbTitle?: string;
  badges?: string[];
}

export default function Hero({
  title,
  subtitle,
  text,
  primaryButton,
  secondaryButton,
  elbTitle,
  badges,
}: HeroProps) {
  return (
    <main
      className="bg-white"
      style={{
        backgroundColor: 'var(--ifm-background-color)',
      }}
      {...tagger.entity('hero').get()}
      {...tagger.action('visible', 'impression').get()}
      {...tagger.context('component', 'hero').get()}
    >
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-[#01b5e2]/10">
        <div className="mx-auto max-w-7xl pb-24 pt-10 sm:pb-32 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:py-40">
          <div className="px-6 lg:px-0 lg:pt-4">
            <div className="mx-auto max-w-2xl">
              <div className="max-w-lg">
                <div className="mt-24 sm:mt-32 lg:mt-16">
                  <a
                    href="https://github.com/elbwalker/walkerOS/releases"
                    className="inline-flex space-x-6"
                  >
                    <span className="rounded-full bg-[#01b5e2]/10 px-3 py-1 text-sm/6 font-semibold text-[#01b5e2] ring-1 ring-inset ring-[#01b5e2]/20 dark:bg-[#01b5e2]/10 dark:text-[#01b5e2] dark:ring-[#01b5e2]/25">
                      What's new
                    </span>
                    <span
                      className="inline-flex items-center space-x-2 text-sm/6 font-medium"
                      style={{ color: 'var(--color-base-content)' }}
                    >
                      <span>Just shipped v1.0</span>
                      <ChevronRightIcon
                        aria-hidden="true"
                        className="size-5"
                        style={{ color: 'var(--color-gray-400)' }}
                      />
                    </span>
                  </a>
                </div>
                <h1
                  className="mt-10 text-pretty text-5xl font-semibold tracking-tight sm:text-7xl"
                  style={{ color: 'var(--color-base-content)' }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p
                    className="mt-4 text-pretty text-2xl font-medium"
                    style={{ color: 'var(--color-base-content)' }}
                  >
                    {subtitle}
                  </p>
                )}
                {text && (
                  <p
                    className="mt-8 text-pretty text-lg font-medium sm:text-xl/8"
                    style={{ color: 'var(--color-gray-500)' }}
                    {...(elbTitle &&
                      tagger.property('hero', 'title', elbTitle).get())}
                  >
                    {text}
                  </p>
                )}
                <div className="mt-10 flex items-center gap-x-6">
                  {primaryButton && (
                    <Link
                      to={primaryButton.link}
                      className="rounded-md bg-[#01b5e2] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#01b5e2]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01b5e2]"
                      {...tagger
                        .action(primaryButton.elbAction || 'click')
                        .get()}
                    >
                      {primaryButton.children}
                    </Link>
                  )}
                  {secondaryButton && (
                    <Link
                      to={secondaryButton.link}
                      className="text-sm/6 font-semibold"
                      style={{ color: 'var(--color-base-content)' }}
                      {...tagger
                        .action(secondaryButton.elbAction || 'click')
                        .get()}
                    >
                      {secondaryButton.children}{' '}
                      <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
                {badges && badges.length > 0 && (
                  <div className="mt-10">
                    {badges.map((badge, index) => (
                      <Check key={index}>{badge}</Check>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:flex lg:items-center px-6 lg:px-0">
            {/* Architecture Diagram */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
              {/* Sources Column */}
              <div className="flex flex-col items-center">
                <span
                  className="text-base font-semibold uppercase tracking-wide text-center mb-4"
                  style={{ color: 'var(--color-gray-400)' }}
                >
                  Sources
                </span>
                <div
                  className="flex flex-col gap-4 w-full"
                  style={{ maxWidth: '200px' }}
                >
                  {/* Client-side */}
                  <div
                    className="rounded-xl border border-white/20 dark:border-gray-600 p-4"
                    style={{ backgroundColor: 'var(--ifm-background-color)' }}
                  >
                    <span
                      className="text-sm font-medium mb-3 block"
                      style={{ color: 'var(--color-gray-500)' }}
                    >
                      Client-side
                    </span>
                    <div className="flex flex-col gap-2">
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="mdi:web" className="w-5 h-5" />
                        <span className="text-base">Browser</span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="mdi:layers-outline" className="w-5 h-5" />
                        <span className="text-base">dataLayer</span>
                      </div>
                    </div>
                  </div>
                  {/* Server-side */}
                  <div
                    className="rounded-xl border border-white/20 dark:border-gray-600 p-4"
                    style={{ backgroundColor: 'var(--ifm-background-color)' }}
                  >
                    <span
                      className="text-sm font-medium mb-3 block"
                      style={{ color: 'var(--color-gray-500)' }}
                    >
                      Server-side
                    </span>
                    <div className="flex flex-col gap-2">
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="simple-icons:express" className="w-5 h-5" />
                        <span className="text-base">Express</span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="mdi:api" className="w-5 h-5" />
                        <span className="text-base">Fetch</span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="logos:aws-lambda" className="w-5 h-5" />
                        <span className="text-base whitespace-nowrap">
                          AWS Lambda
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="logos:google-cloud" className="w-5 h-5" />
                        <span className="text-base whitespace-nowrap">
                          GCP Functions
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow - Right on desktop, Down on mobile */}
              <div className="hidden lg:flex items-center text-elbwalker">
                <Icon icon="mdi:arrow-right" className="w-8 h-8" />
              </div>
              <div className="lg:hidden text-elbwalker">
                <Icon icon="mdi:arrow-down" className="w-8 h-8" />
              </div>

              {/* Collector */}
              <div className="flex flex-col items-center">
                <span
                  className="text-base font-semibold uppercase tracking-wide text-center mb-4"
                  style={{ color: 'var(--color-gray-400)' }}
                >
                  Collector
                </span>
                <img
                  src="/img/walkerOS_logo_new.svg"
                  alt="walkerOS"
                  className="w-24 h-24 lg:w-32 lg:h-32"
                />
              </div>

              {/* Arrow - Right on desktop, Down on mobile */}
              <div className="hidden lg:flex items-center text-elbwalker">
                <Icon icon="mdi:arrow-right" className="w-8 h-8" />
              </div>
              <div className="lg:hidden text-elbwalker">
                <Icon icon="mdi:arrow-down" className="w-8 h-8" />
              </div>

              {/* Destinations Column */}
              <div className="flex flex-col items-center">
                <span
                  className="text-base font-semibold uppercase tracking-wide text-center mb-4"
                  style={{ color: 'var(--color-gray-400)' }}
                >
                  Destinations
                </span>
                <div
                  className="flex flex-col gap-4 w-full"
                  style={{ maxWidth: '200px' }}
                >
                  {/* Client-side */}
                  <div
                    className="rounded-xl border border-white/20 dark:border-gray-600 p-4"
                    style={{ backgroundColor: 'var(--ifm-background-color)' }}
                  >
                    <span
                      className="text-sm font-medium mb-3 block"
                      style={{ color: 'var(--color-gray-500)' }}
                    >
                      Client-side
                    </span>
                    <div className="flex flex-col gap-2">
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon
                          icon="logos:google-analytics"
                          className="w-5 h-5"
                        />
                        <span className="text-base">GA4</span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="logos:google-ads" className="w-5 h-5" />
                        <span className="text-base whitespace-nowrap">
                          Google Ads
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="logos:meta-icon" className="w-5 h-5" />
                        <span className="text-base whitespace-nowrap">
                          Meta Pixel
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon
                          icon="simple-icons:plausibleanalytics"
                          className="w-5 h-5"
                          style={{ color: '#5850EC' }}
                        />
                        <span className="text-base">Plausible</span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 32 32"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M23,19 L23,29 L18,29 L18,19 L23,19 Z M30,13 L30,29 L25,29 L25,13 L30,13 Z M16,16 L16,29 L11,29 L11,16 L16,16 Z M9,22 L9,29 L4,29 L4,22 L9,22 Z M21,21 L20,21 L20,27 L21,27 L21,21 Z M28,15 L27,15 L27,27 L28,27 L28,15 Z M14,18 L13,18 L13,27 L14,27 L14,18 Z M7,24 L6,24 L6,27 L7,27 L7,24 Z M30,3 L30,8 L28,8 L27.9991212,6.329 L19.9544292,13.3686427 L15.9699243,9.38413782 L3.93857049,20.4128788 L2.58712123,18.9385705 L16.0300757,6.61586218 L20.0455708,10.6313573 L26.4801212,5 L25,5 L25,3 L30,3 Z"
                            fill="#006BD6"
                          />
                        </svg>
                        <span className="text-base whitespace-nowrap">
                          Piwik PRO
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="mdi:api" className="w-5 h-5" />
                        <span className="text-base">API</span>
                      </div>
                    </div>
                  </div>
                  {/* Server-side */}
                  <div
                    className="rounded-xl border border-white/20 dark:border-gray-600 p-4"
                    style={{ backgroundColor: 'var(--ifm-background-color)' }}
                  >
                    <span
                      className="text-sm font-medium mb-3 block"
                      style={{ color: 'var(--color-gray-500)' }}
                    >
                      Server-side
                    </span>
                    <div className="flex flex-col gap-2">
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="logos:aws" className="w-5 h-5" />
                        <span className="text-base">AWS</span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="logos:google-cloud" className="w-5 h-5" />
                        <span className="text-base">BigQuery</span>
                      </div>
                      <div
                        className="flex items-center gap-3"
                        style={{ color: 'var(--color-base-content)' }}
                      >
                        <Icon icon="logos:meta-icon" className="w-5 h-5" />
                        <span className="text-base whitespace-nowrap">
                          Meta CAPI
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 -z-10 h-24 sm:h-32"
          style={{
            background:
              'linear-gradient(to top, var(--ifm-background-color), transparent)',
          }}
        />
      </div>
    </main>
  );
}
