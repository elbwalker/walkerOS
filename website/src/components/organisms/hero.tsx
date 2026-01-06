import React, { ReactNode } from 'react';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import Link from '@docusaurus/Link';
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
          <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-1/2 -z-10 -mr-10 w-[200%] skew-x-[-30deg] shadow-xl shadow-[#01b5e2]/10 ring-1 ring-[#01b5e2]/5 md:-mr-20 lg:-mr-36"
              style={{ backgroundColor: 'var(--ifm-background-surface-color)' }}
            />
            <div className="shadow-lg md:rounded-3xl">
              <div className="bg-[#01b5e2] [clip-path:inset(0)] md:[clip-path:inset(0_round_theme(borderRadius.3xl))]">
                <div
                  aria-hidden="true"
                  className="absolute -inset-y-px left-1/2 -z-10 ml-10 w-[200%] skew-x-[-30deg] bg-[#01b5e2]/20 opacity-20 ring-1 ring-inset ring-white md:ml-20 lg:ml-36"
                />
                <div className="relative px-6 pt-8 sm:pt-16 md:pl-16 md:pr-0">
                  <div className="mx-auto max-w-2xl md:mx-0 md:max-w-none">
                    <div
                      className="w-screen overflow-hidden rounded-tl-xl"
                      style={{ backgroundColor: 'var(--code-editor-bg)' }}
                    >
                      <div
                        className="flex items-center ring-1 ring-white/5"
                        style={{
                          backgroundColor: 'var(--code-editor-header-bg)',
                        }}
                      >
                        {/* Traffic light dots */}
                        <div className="flex items-center gap-2 px-4">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                        </div>
                        {/* File tabs */}
                        <div
                          className="-mb-px flex text-sm/6 font-medium"
                          style={{ color: 'var(--code-editor-text-muted)' }}
                        >
                          <div
                            className="border-b border-r border-b-white/20 border-r-white/10 px-4 py-2"
                            style={{
                              backgroundColor:
                                'var(--code-editor-tab-active-bg)',
                              color: 'var(--code-editor-text)',
                            }}
                          >
                            flow.json
                          </div>
                          <div className="border-r border-gray-600/10 px-4 py-2">
                            README.md
                          </div>
                        </div>
                      </div>
                      <div
                        className="px-6 pb-14 pt-6 text-sm"
                        style={{ color: 'var(--code-editor-text)' }}
                      >
                        <code className="block">
                          {'{'}
                          <br />
                          &nbsp;&nbsp;
                          <span className="text-blue-400">"sources"</span>:{' '}
                          {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"browser"</span>:{' '}
                          {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"package"</span>:{' '}
                          <span className="text-green-400">
                            "@walkeros/web-source-browser"
                          </span>
                          ,<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"config"</span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">
                            "settings"
                          </span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">
                            "pageview"
                          </span>: <span className="text-yellow-400">true</span>
                          ,<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"session"</span>:{' '}
                          <span className="text-yellow-400">true</span>
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                          <br />
                          &nbsp;&nbsp;{'}'},<br />
                          &nbsp;&nbsp;
                          <span className="text-blue-400">
                            "destinations"
                          </span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"gtag"</span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"package"</span>:{' '}
                          <span className="text-green-400">
                            "@walkeros/web-destination-gtag"
                          </span>
                          ,<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"config"</span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">
                            "settings"
                          </span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"ga4"</span>: {'{'}{' '}
                          <span className="text-blue-400">"measurementId"</span>
                          :{' '}
                          <span className="text-green-400">"G-XXXXXXXXXX"</span>{' '}
                          {'}'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;{'}'},<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"api"</span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"package"</span>:{' '}
                          <span className="text-green-400">
                            "@walkeros/web-destination-api"
                          </span>
                          ,<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"config"</span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">
                            "settings"
                          </span>: {'{'}
                          <br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          <span className="text-blue-400">"url"</span>:{' '}
                          <span className="text-green-400">
                            "https://your-api.com/events"
                          </span>
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
                        </code>
                      </div>
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10 md:rounded-3xl"
                  />
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
