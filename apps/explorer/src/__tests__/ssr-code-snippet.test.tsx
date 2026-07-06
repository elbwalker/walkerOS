import React from 'react';
import { renderToString } from 'react-dom/server';
import { CodeSnippet } from '../components/molecules/code-snippet';

it('CodeSnippet renders code server-side (no Monaco Loading)', () => {
  const html = renderToString(
    <CodeSnippet
      code={`npm install @walkeros/web-destination-amplitude`}
      language="bash"
    />,
  );
  // Shiki tokenizes into per-token spans, so assert on the install target
  // (a single token) rather than the literal "npm install" phrase.
  expect(html).toContain('install');
  expect(html).toContain('@walkeros/web-destination-amplitude');
  expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
  expect(html).not.toContain('Loading');
});
