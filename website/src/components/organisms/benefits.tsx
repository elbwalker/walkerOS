import React from 'react';
import { tagger } from '@site/src/components/walkerjs';

const benefits = [
  {
    name: 'Version controlled',
    description:
      'Your tracking code lives in your repository alongside your application code. Changes go through the same PR review, testing, and deployment process.',
  },
  {
    name: 'AI readiness',
    description:
      'Fully typed TypeScript with SKILL files for AI agents. Let them understand, extend, and maintain your tracking setup.',
  },
  {
    name: 'Infrastructure parity',
    description:
      "If your frontend, backend, and infrastructure are code-first, why isn't your tracking? Treat it like real engineering work.",
  },
  {
    name: 'You control what runs',
    description:
      'No "agency access" that bypasses engineering review. No arbitrary third-party scripts executing without your knowledge.',
  },
  {
    name: 'Data sovereignty',
    description:
      'Self-hosted means your data stays on your infrastructure. Full control over what runs on your domain.',
  },
  {
    name: 'Testable privacy logic',
    description:
      'Consent management in code, not configuration UIs. Test privacy compliance locally before production.',
  },
  {
    name: 'Security by design',
    description:
      'Code review gates prevent unauthorized changes. Eliminates the "security leak box" problem of UI-based tag managers.',
  },
  {
    name: 'CI/CD integration',
    description:
      'Deploy tracking changes through your existing pipeline. Same tools, same process, same reliability guarantees.',
  },
];

export default function Benefits() {
  return (
    <div
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
      className="py-24 sm:py-32"
      {...tagger.entity('benefits')}
      {...tagger.action('visible:impression')}
      {...tagger.context('component', 'benefits')}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-5">
          <div className="col-span-2">
            <h2
              className="text-base/7 font-semibold"
              style={{ color: 'var(--color-primary)' }}
            >
              Data ownership from the root
            </h2>
            <p
              className="mt-2 text-pretty text-4xl font-semibold tracking-tight sm:text-5xl"
              style={{ color: 'var(--color-base-content)' }}
            >
              Tracking infrastructure you can trust
            </p>
            <p
              className="mt-6 text-base/7"
              style={{ color: 'var(--color-gray-500)' }}
            >
              Your analytics infrastructure gets the same treatment as your
              application code: version controlled, code reviewed, tested, and
              deployed through your existing CI/CD pipeline.
            </p>
          </div>
          <dl className="col-span-3 grid grid-cols-1 gap-x-8 gap-y-10 text-base/7 sm:grid-cols-2 lg:gap-y-16">
            {benefits.map((benefit) => (
              <div key={benefit.name} className="relative pl-9">
                <dt
                  className="font-semibold"
                  style={{ color: 'var(--color-base-content)' }}
                >
                  <svg
                    aria-hidden="true"
                    className="absolute left-0 top-1 size-5"
                    style={{ color: 'var(--color-primary)' }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {benefit.name}
                </dt>
                <dd className="mt-2" style={{ color: 'var(--color-gray-500)' }}>
                  {benefit.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
