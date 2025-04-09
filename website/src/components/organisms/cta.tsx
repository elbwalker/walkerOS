import React, { ReactNode } from 'react';
import { Button, ButtonProps } from '@site/src/components/atoms/buttons';
import { tagger } from '@site/src/components/walkerjs';

interface CTAProps {
  text: ReactNode;
  primaryButton?: ButtonProps;
  secondaryButton?: ButtonProps;
  elbTitle?: string;
}

export default function CTA({
  text,
  primaryButton,
  secondaryButton,
  elbTitle,
}: CTAProps) {
  // Set default variant for secondaryButton if not provided
  const secondaryButtonWithDefault = secondaryButton
    ? { ...secondaryButton, variant: secondaryButton.variant || 'secondary' }
    : undefined;

  return (
    <div
      {...tagger.entity('cta')}
      {...tagger.action('visible:impression')}
      {...tagger.context('component', 'cta')}
    >
      <div className="mx-auto max-w-7xl py-12 px-4 text-center sm:px-6 lg:py-16 lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span
            {...(elbTitle && tagger.property('title', elbTitle))}
            className="block text-black dark:text-white"
          >
            {text}
          </span>
        </h2>
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
          {primaryButton && <Button {...primaryButton} />}
          {secondaryButtonWithDefault && (
            <Button {...secondaryButtonWithDefault} />
          )}
        </div>
      </div>
    </div>
  );
}
