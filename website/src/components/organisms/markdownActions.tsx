import React, { useEffect, useState } from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import {
  MarkdownMark,
  OpenAIMark,
  ClaudeMark,
} from '@site/src/components/atoms/brandMarks';
import {
  markdownExportPath,
  markdownExportUrl,
} from '@site/src/utils/markdown-export';
import styles from './markdownActions.module.css';

export default function MarkdownActions(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const { metadata } = useDoc();

  const path = markdownExportPath(metadata.permalink);
  const url = markdownExportUrl(siteConfig.url, metadata.permalink);
  const prompt = encodeURIComponent(`Read ${url} and help me use walkerOS.`);

  // Rendered on the server so the controls exist without JavaScript, then
  // confirmed against the served file. Only a response that says the export is
  // missing takes them away: a request that never completed is not evidence of
  // absence, and hiding a working link because someone is offline is worse than
  // leaving it. Rechecked on client-side navigation to another doc.
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let current = true;
    setAvailable(true);

    fetch(path, { method: 'HEAD' })
      .then((response) => {
        if (current && !response.ok) setAvailable(false);
      })
      .catch(() => {});

    return () => {
      current = false;
    };
  }, [path]);

  return (
    <>
      {/* Only doc routes render a doc item, and every doc route has an export,
          so this link relation can never point at a missing file. */}
      <Head>
        <link rel="alternate" type="text/markdown" href={url} />
      </Head>
      {available && (
        <div data-exclude-from-llms="true" className={styles.bar}>
          <span className={styles.note}>Ask your AI</span>
          <a
            className={styles.action}
            href={path}
            title="View as Markdown"
            aria-label="View as Markdown"
          >
            <MarkdownMark className={styles.markdownMark} />
          </a>
          <a
            className={styles.action}
            href={`https://chatgpt.com/?q=${prompt}&hints=search`}
            target="_blank"
            rel="noreferrer"
            title="Open in ChatGPT"
            aria-label="Open in ChatGPT"
          >
            <OpenAIMark className={styles.openaiMark} />
          </a>
          <a
            className={styles.action}
            href={`https://claude.ai/new?q=${prompt}`}
            target="_blank"
            rel="noreferrer"
            title="Open in Claude"
            aria-label="Open in Claude"
          >
            <ClaudeMark className={styles.claudeMark} />
          </a>
        </div>
      )}
    </>
  );
}
