import React, { ReactNode } from 'react';
import { Button, ButtonProps } from '@site/src/components/atoms/buttons';
import { Check } from '@site/src/components/atoms/icons';
import { tagger } from '@site/src/components/walkerjs';

interface HeroProps {
  title: ReactNode;
  subtitle?: ReactNode;
  text?: ReactNode;
  primaryButton?: ButtonProps;
  secondaryButton?: ButtonProps;
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
  // Set default variant for secondaryButton if not provided
  const secondaryButtonWithDefault = secondaryButton
    ? { ...secondaryButton, variant: secondaryButton.variant || 'secondary' }
    : undefined;

  return (
    <main
      className="relative mx-3 mt-16 max-w-7xl sm:mt-24 lg:mx-auto"
      {...tagger.entity('hero')}
      {...tagger.action('visible:impression')}
      {...tagger.context('component', 'hero')}
    >
      <div className="text-center">
        <h1 className="text-6xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          {title}
          {subtitle && (
            <div className="block xl:inline text-black dark:text-white">
              {subtitle}
            </div>
          )}
        </h1>
        {text && (
          <p
            className="mx-auto mt-3 text-base sm:text-lg md:mt-5 md:text-xl"
            {...(elbTitle && tagger.property('title', elbTitle))}
          >
            {text}
          </p>
        )}
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
          {primaryButton && <Button {...primaryButton} />}
          {secondaryButtonWithDefault && (
            <Button {...secondaryButtonWithDefault} />
          )}
        </div>
      </div>
      {badges && badges.length && (
        <div className="mt-10 text-center">
          {badges.map((badge, index) => (
            <Check key={index}>{badge}</Check>
          ))}
        </div>
      )}
    </main>
  );
}
