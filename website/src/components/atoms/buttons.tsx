import React from 'react';
import Link from '@docusaurus/Link';

const classBasics =
  'mx-2 my-4 flex items-center justify-center rounded-md border border-transparent px-6 py-2 text-base text-white hover:text-white font-medium md:text-lg hover:no-underline ';
type ButtonProps = {
  children: React.ReactNode;
  link?: string;
  text?: string;
  isSecondary?: boolean;
  elbaction?: string; // @TODO
};
export function Button({ children, link, text, isSecondary }: ButtonProps) {
  const classColor = !isSecondary
    ? 'bg-elbwalker hover:bg-elbwalker-400'
    : 'bg-gray-800 hover:bg-gray-700 ';
  const className = classBasics + classColor;
  const inline = text || children;
  return link ? (
    <Link className={className} to={link}>
      {inline}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

export function ButtonCentered({
  children,
  link,
  text,
  isSecondary,
}: ButtonProps) {
  return (
    <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
      <Button link={link} text={text} isSecondary={isSecondary}>
        {children}
      </Button>
    </div>
  );
}
