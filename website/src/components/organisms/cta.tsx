import React, { ReactNode } from 'react';
import { Button, ButtonProps } from '@site/src/components/atoms/buttons';
import { tagger } from '@site/src/components/walkerjs';

interface CTAProps {
  title?: ReactNode;
  text?: ReactNode;
  description?: ReactNode;
  primaryButton?: ButtonProps;
  secondaryButton?: ButtonProps;
  elbTitle?: string;
}

export default function CTA({
  title,
  text,
  description,
  primaryButton,
  secondaryButton,
  elbTitle,
}: CTAProps) {
  const heading = title || text;
  return (
    <div
      {...tagger.entity('cta')}
      {...tagger.action('visible:impression')}
      {...tagger.context('component', 'cta')}
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
    >
      <div className="px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {heading && (
            <h2
              {...(elbTitle && tagger.property('title', elbTitle))}
              className="text-4xl font-semibold tracking-tight sm:text-5xl"
              style={{ color: 'var(--color-base-content)' }}
            >
              {heading}
            </h2>
          )}
          {description && (
            <p
              className="mx-auto mt-6 text-lg/8"
              style={{ color: 'var(--color-gray-500)' }}
            >
              {description}
            </p>
          )}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {primaryButton && (
              <a
                href={primaryButton.link}
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm"
                style={{
                  backgroundColor: 'var(--color-primary)',
                }}
                {...tagger.action(primaryButton.elbAction || 'click')}
              >
                {primaryButton.children}
              </a>
            )}
            {secondaryButton && (
              <a
                href={secondaryButton.link}
                className="text-sm/6 font-semibold"
                style={{ color: 'var(--color-base-content)' }}
                {...tagger.action(secondaryButton.elbAction || 'click')}
              >
                {secondaryButton.children} <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
