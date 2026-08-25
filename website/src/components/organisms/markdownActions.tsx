import React, { useEffect, useState } from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import {
  markdownExportPath,
  markdownExportUrl,
} from '@site/src/utils/markdown-export';

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_LABEL: Record<CopyState, string> = {
  idle: 'Copy as Markdown',
  copied: 'Copied',
  failed: 'Copy failed',
};

export default function MarkdownActions(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { metadata } = useDoc();

  const path = markdownExportPath(metadata.permalink);
  const url = markdownExportUrl(siteConfig.url, metadata.permalink);

  // Rendered on the server so the controls exist without JavaScript, then
  // confirmed against the served file. Only a response that says the export is
  // missing takes them away: a request that never completed is not evidence of
  // absence, and hiding a working link because someone is offline is worse than
  // leaving it. Rechecked on client-side navigation to another doc.
  const [available, setAvailable] = useState(true);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    let current = true;
    setAvailable(true);
    setCopyState('idle');

    fetch(path, { method: 'HEAD' })
      .then((response) => {
        if (current && !response.ok) setAvailable(false);
      })
      .catch(() => {});

    return () => {
      current = false;
    };
  }, [path]);

  async function copyMarkdown(): Promise<void> {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      await navigator.clipboard.writeText(await response.text());
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <>
      {/* Only doc routes render a doc item, and every doc route has an export,
          so this link relation can never point at a missing file. */}
      <Head>
        <link rel="alternate" type="text/markdown" href={url} />
      </Head>
      {available && (
        <div
          data-exclude-from-llms="true"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            marginBottom: '1rem',
          }}
        >
          <button
            type="button"
            className="button button--secondary button--sm"
            onClick={copyMarkdown}
          >
            {COPY_LABEL[copyState]}
          </button>
          <a className="button button--secondary button--sm" href={path}>
            View as Markdown
          </a>
          <a
            className="button button--secondary button--sm"
            href={`https://chatgpt.com/?q=${encodeURIComponent(
              `Read ${url} and help me use walkerOS.`,
            )}&hints=search`}
            target="_blank"
            rel="noreferrer"
          >
            Open in ChatGPT
          </a>
          <a
            className="button button--secondary button--sm"
            href={`https://claude.ai/new?q=${encodeURIComponent(
              `Read ${url} and help me use walkerOS.`,
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in Claude
          </a>
        </div>
      )}
    </>
  );
}
