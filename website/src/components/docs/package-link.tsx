import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { Icon } from '@iconify/react';

type PackageLinkProps = {
  browser?: string;
  es5?: string;
  github?: string;
  npm?: string;
};

export function PackageButton({ icon, to, text, style = '' }): JSX.Element {
  const classes = clsx(
    'inline-flex items-center justify-center h-9 mr-3 px-3 mb-6 gap-x-2 bg-white',
    'text-xs font-medium text-gray-900',
    'border border-gray-200 rounded-lg',
    'focus:outline-none hover:no-underline hover:bg-gray-100 hover:text-gray-700',
    'dark:focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700',
    style,
  );

  return (
    <Link to={to} className={classes}>
      <Icon icon={icon} className="h-6 w-6 fill-gray-400" /> {text}
    </Link>
  );
}

export default function PackageLink({
  browser,
  es5,
  github,
  npm,
}: PackageLinkProps): JSX.Element {
  return (
    <>
      {github && (
        <PackageButton
          icon="mdi:github"
          to={'https://github.com/elbwalker/walkerOS/tree/main/' + github}
          text="Source code"
        />
      )}
      {npm && (
        <PackageButton
          icon="mdi:npm"
          to={'https://www.npmjs.com/package/' + npm}
          text="Package"
        />
      )}
      {browser && (
        <PackageButton
          icon="mdi:google-chrome"
          to={`https://cdn.jsdelivr.net/npm/${browser}@latest/dist/index.browser.js`}
          text="Browser"
        />
      )}
      {es5 && (
        <PackageButton
          icon="mdi:file-code-outline"
          to={`https://cdn.jsdelivr.net/npm/${es5}@latest/dist/index.es5.js`}
          text="ES5"
        />
      )}
    </>
  );
}
