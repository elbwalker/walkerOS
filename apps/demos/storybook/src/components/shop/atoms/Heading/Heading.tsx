import type { HTMLAttributes } from 'react';

export type HeadingLevel = 1 | 2 | 3 | 4;

export type HeadingVariant =
  | 'display'
  | 'heading-lg'
  | 'heading-md'
  | 'title-plan'
  | 'title-card'
  | 'title-item';

const tags: Record<HeadingLevel, 'h1' | 'h2' | 'h3' | 'h4'> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
};

const variants: Record<HeadingVariant, string> = {
  display: 'text-display',
  'heading-lg': 'text-heading-lg',
  'heading-md': 'text-heading-md',
  'title-plan': 'text-title-plan',
  'title-card': 'text-title-card',
  'title-item': 'text-title-item',
};

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  variant?: HeadingVariant;
}

export const Heading = ({
  level = 2,
  variant = 'title-plan',
  className = '',
  ...rest
}: HeadingProps) => {
  const Tag = tags[level];
  return (
    <Tag className={`text-fg ${variants[variant]} ${className}`} {...rest} />
  );
};
