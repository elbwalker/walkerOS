import React from 'react';
import Link from '@docusaurus/Link';
import { tagger } from '@site/src/components/walkerjs';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'ghost'
  | 'link';

export type ButtonProps = {
  children: React.ReactNode;
  link?: string;
  text?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  elbAction?: string;
};

export function Button({
  children,
  link,
  text,
  variant = 'primary',
  size = 'md',
  className = '',
  elbAction = 'click',
}: ButtonProps) {
  const buttonClasses = `dui-btn dui-btn-${variant} dui-btn-${size} text-white ${className}`;
  const content = text || children;

  return link ? (
    <Link className={buttonClasses} to={link} {...tagger.action(elbAction)}>
      {content}
    </Link>
  ) : (
    <button className={buttonClasses} {...tagger.action(elbAction)}>
      {content}
    </button>
  );
}

export function ButtonCentered(props: ButtonProps) {
  return (
    <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
      <Button {...props} />
    </div>
  );
}
