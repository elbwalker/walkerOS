import type { HTMLAttributes } from 'react';

export type TextVariant =
  | 'lead'
  | 'body-lg'
  | 'body'
  | 'ui'
  | 'small'
  | 'label'
  | 'eyebrow';

export type TextTone = 'fg' | 'fg-2' | 'fg-3' | 'link';

export type TextElement = 'p' | 'span' | 'div' | 'dt' | 'dd' | 'strong';

const variants: Record<TextVariant, string> = {
  lead: 'text-lead',
  'body-lg': 'text-body-lg',
  body: 'text-body',
  ui: 'text-ui',
  small: 'text-small',
  label: 'text-label',
  eyebrow: 'text-eyebrow',
};

const tones: Record<TextTone, string> = {
  fg: 'text-fg',
  'fg-2': 'text-fg-2',
  'fg-3': 'text-fg-3',
  link: 'text-link',
};

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: TextElement;
  variant?: TextVariant;
  tone?: TextTone;
}

export const Text = ({
  as: Tag = 'p',
  variant = 'body',
  tone = 'fg-2',
  className = '',
  ...rest
}: TextProps) => (
  <Tag
    className={`${variants[variant]} ${tones[tone]} ${className}`}
    {...rest}
  />
);
