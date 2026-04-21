import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { Icon } from '@walkeros/explorer';

type PackageLinkProps = {
  env?: 'web' | 'server' | 'both';
  browser?: string;
  es5?: string;
  github?: string;
  npm?: string;
  status?: 'beta';
};

type PackageButtonProps = {
  icon: string;
  to?: string;
  text: string;
  style?: string;
};

export function PackageButton({
  icon,
  to,
  text,
  style = '',
}: PackageButtonProps): React.JSX.Element {
  const classes = clsx(
    'inline-flex items-center justify-center h-9 mr-3 px-3 mb-6 gap-x-2',
    'text-xs font-medium text-black',
    'border border-gray-600 rounded-lg',
    to && 'hover:bg-gray-500',
    style,
  );

  const inner = (
    <>
      <Icon icon={icon} className="h-6 w-6 fill-gray-400" /> {text}
    </>
  );

  return to ? (
    <Link to={to} className={classes}>
      {inner}
    </Link>
  ) : (
    <span className={classes}>{inner}</span>
  );
}

export default function PackageLink({
  env,
  browser,
  es5,
  github,
  npm,
  status,
}: PackageLinkProps): React.JSX.Element {
  const envText = {
    web: 'Web',
    server: 'Server',
    both: 'Web & Server',
  };

  return (
    <>
      {env && (
        <PackageButton icon="mdi:package-variant" to="#" text={envText[env]} />
      )}
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
      {status === 'beta' && <PackageButton icon="mdi:beta" text="Beta" />}
    </>
  );
}
