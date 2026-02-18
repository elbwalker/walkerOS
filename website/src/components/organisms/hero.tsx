import React, { ReactNode } from 'react';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import Link from '@docusaurus/Link';
import { ArchitectureFlow, Icon } from '@walkeros/explorer';
import type { FlowColumn } from '@walkeros/explorer';
import { Check } from '@site/src/components/atoms/icons';
import { tagger } from '@site/src/components/walkerjs';

const walkerOSSources: FlowColumn = {
  title: 'Sources',
  sections: [
    {
      title: 'Client-side',
      items: [
        { icon: <Icon icon="mdi:web" />, label: 'Browser' },
        { icon: <Icon icon="mdi:layers-outline" />, label: 'dataLayer' },
      ],
    },
    {
      title: 'Server-side',
      items: [
        { icon: <Icon icon="simple-icons:express" />, label: 'Express' },
        { icon: <Icon icon="mdi:api" />, label: 'Fetch' },
        { icon: <Icon icon="logos:aws-lambda" />, label: 'AWS Lambda' },
        { icon: <Icon icon="logos:google-cloud" />, label: 'GCP Functions' },
      ],
    },
  ],
};

const walkerOSDestinations: FlowColumn = {
  title: 'Destinations',
  sections: [
    {
      title: 'Client-side',
      items: [
        { icon: <Icon icon="logos:google-analytics" />, label: 'GA4' },
        { icon: <Icon icon="logos:google-ads" />, label: 'Google Ads' },
        { icon: <Icon icon="logos:meta-icon" />, label: 'Meta Pixel' },
        {
          icon: (
            <Icon
              icon="simple-icons:plausibleanalytics"
              style={{ color: '#5850EC' }}
            />
          ),
          label: 'Plausible',
        },
        { icon: <Icon icon="walkeros:piwik-pro" />, label: 'Piwik PRO' },
        { icon: <Icon icon="mdi:api" />, label: 'API' },
      ],
    },
    {
      title: 'Server-side',
      items: [
        { icon: <Icon icon="logos:aws" />, label: 'AWS' },
        { icon: <Icon icon="logos:google-cloud" />, label: 'BigQuery' },
        { icon: <Icon icon="logos:meta-icon" />, label: 'Meta CAPI' },
      ],
    },
  ],
};

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
      {...tagger.entity('hero')}
      {...tagger.action('visible:impression')}
      {...tagger.context('component', 'hero')}
    >
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-[#01b5e2]/10">
        <div className="mx-auto max-w-7xl pb-24 pt-10 sm:pb-32 xl:grid xl:grid-cols-2 xl:gap-x-8 xl:px-8 xl:py-40">
          <div className="px-6 xl:px-0 xl:pt-4">
            <div className="mx-auto max-w-2xl">
              <div className="max-w-lg">
                <div className="mt-24 sm:mt-32 xl:mt-16">
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
                      <span>Just shipped v1.2</span>
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
                    {...(elbTitle && tagger.property('title', elbTitle))}
                  >
                    {text}
                  </p>
                )}
                <div className="mt-10 flex items-center gap-x-6">
                  {primaryButton && (
                    <Link
                      to={primaryButton.link}
                      className="rounded-md bg-[#01b5e2] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#01b5e2]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01b5e2]"
                      {...tagger.action(
                        `click:${primaryButton.elbAction || 'click'}`,
                      )}
                    >
                      {primaryButton.children}
                    </Link>
                  )}
                  {secondaryButton && (
                    <Link
                      to={secondaryButton.link}
                      className="text-sm/6 font-semibold"
                      style={{ color: 'var(--color-base-content)' }}
                      {...tagger.action(
                        `click:${secondaryButton.elbAction || 'click'}`,
                      )}
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
          <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl xl:mx-0 xl:mt-0 xl:flex xl:items-center px-6 xl:px-0">
            <ArchitectureFlow
              sources={walkerOSSources}
              centerTitle="Collector"
              center={
                <img
                  src="/img/walkerOS_logo.svg"
                  alt="walkerOS"
                  className="w-24 h-24 xl:w-32 xl:h-32"
                />
              }
              destinations={walkerOSDestinations}
            />
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
