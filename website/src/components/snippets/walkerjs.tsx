import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { CodeSnippet } from '@walkeros/explorer';
import { walkerjsPinnedUrl, walkerjsUrl } from './walkerjs-url';

export { WALKERJS_HOST, walkerjsPinnedUrl, walkerjsUrl } from './walkerjs-url';

// Set in docusaurus.config.ts from website/package.json. Without it a page
// would publish a URL for no release, so the build fails instead.
function useWalkerosVersion(): string {
  const { siteConfig } = useDocusaurusContext();
  const version = siteConfig.customFields?.walkerosVersion;
  if (typeof version !== 'string')
    throw new Error('customFields.walkerosVersion is not set');
  return version;
}

/** The one-line install for the current release line. */
export function WalkerjsSnippet(): React.JSX.Element {
  const url = walkerjsUrl(useWalkerosVersion());
  return (
    <CodeSnippet
      code={`<script async src="${url}"></script>`}
      language="html"
    />
  );
}

type WalkerjsUrlProps = {
  /** The exact release instead of the release line. */
  pinned?: boolean;
};

/** The file's URL as inline code. */
export function WalkerjsUrl({
  pinned = false,
}: WalkerjsUrlProps): React.JSX.Element {
  const version = useWalkerosVersion();
  return (
    <code>{pinned ? walkerjsPinnedUrl(version) : walkerjsUrl(version)}</code>
  );
}
