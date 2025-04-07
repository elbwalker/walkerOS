import React from 'react';
import Link from '@docusaurus/Link';

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

type ButtonProps = {
  children: React.ReactNode;
  link?: string;
  text?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  elbaction?: string; // @TODO
};

export function Button({
  children,
  link,
  text,
  variant = 'primary',
  size = 'md',
  className = '',
}: ButtonProps) {
  const buttonClasses = `dui-btn dui-btn-${variant} dui-btn-${size} mx-2 text-white ${className}`;
  const content = text || children;

  return link ? (
    <Link className={buttonClasses} to={link}>
      {content}
    </Link>
  ) : (
    <button className={buttonClasses}>{content}</button>
  );
}

export function ButtonCentered(props: ButtonProps) {
  return (
    <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
      <Button {...props} />
    </div>
  );
}
