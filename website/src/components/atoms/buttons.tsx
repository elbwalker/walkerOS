import React from 'react';
import Link from '@docusaurus/Link';

const classBasics =
  'mx-2 flex w-full items-center justify-center rounded-md border border-transparent px-6 py-2 text-base text-white hover:text-white font-medium md:text-lg hover:no-underline ';
type ButtonProps = {
  children: React.ReactNode;
  link?: string;
  isSecondary?: boolean;
  elbaction?: string; // @TODO
};
export function Button({
  children,
  link,
  isSecondary,
}: ButtonProps): JSX.Element {
  let classColor = !isSecondary
    ? 'bg-elbwalker hover:bg-elbwalker-400'
    : 'bg-gray-800 hover:bg-gray-700 ';
  let className = classBasics + classColor;
  return link ? (
    <Link className={className} to={link}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
