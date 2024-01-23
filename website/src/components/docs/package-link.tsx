import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { Icon } from '@iconify/react';

type PackageLinkProps = {
  github?: string;
  npm?: string;
};

function Button({ icon, to, text }): JSX.Element {
  const classes = clsx(
    'inline-flex items-center justify-center h-9 mr-3 px-3 mb-6 gap-x-2 bg-white',
    'text-xs font-medium text-gray-900',
    'border border-gray-200 rounded-lg',
    'focus:outline-none hover:no-underline hover:bg-gray-100 hover:text-gray-700',
    'dark:focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700',
  );

  return (
    <Link to={to} className={classes}>
      <Icon icon={icon} className="h-6 w-6 fill-gray-400" /> {text}
    </Link>
  );
}

export default function PackageLink({
  github,
  npm,
}: PackageLinkProps): JSX.Element {
  return (
    <>
      {github && (
        <Button
          icon="mdi:github"
          to={'https://github.com/elbwalker/walkerOS/tree/main/' + github}
          text={github}
        />
      )}
      {npm && (
        <Button
          icon="mdi:npm"
          to={'https://www.npmjs.com/package/' + npm}
          text={npm}
        />
      )}
    </>
  );
}
