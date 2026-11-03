import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile, run } from '@mdx-js/mdx';
import * as jsxRuntime from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { composeQuickstart } from '@walkeros/core/dev';

// The real partials, compiled and rendered the way a docs page renders them.
const SNIPPETS = new URL('../src/components/snippets/', import.meta.url);

async function partial(name) {
  const url = new URL(name, SNIPPETS);
  const compiled = await compile(readFileSync(url, 'utf8'), {
    outputFormat: 'function-body',
  });
  const { default: Content } = await run(String(compiled), {
    ...jsxRuntime,
    baseUrl: url,
  });
  return Content;
}

function render(Content, props) {
  const snippets = [];
  const components = {
    CodeSnippet: ({ code, language }) => {
      snippets.push({ code, language });
      return React.createElement('pre', null, code);
    },
    Tabs: ({ children }) => React.createElement('div', null, children),
    TabItem: ({ children }) => React.createElement('section', null, children),
    PropertyTable: () => null,
    StepExample: () => null,
  };
  const html = renderToStaticMarkup(
    React.createElement(Content, { ...props, components }),
  );
  return { html, snippets };
}

const $meta = {
  package: '@walkeros/web-destination-x',
  version: '1.0.0',
  type: 'destination',
  platform: ['web'],
};

describe('Quickstart partial', () => {
  test('renders the install line, the integrated code and the flow from the composer', async () => {
    const minimal = {
      settings: { token: 'placeholder' },
      secrets: { token: 'X_TOKEN' },
    };
    // A credential is a secret, which only a server flow holds.
    const server = { ...$meta, platform: ['server'] };
    const { snippets } = render(await partial('_quickstart.mdx'), {
      data: { $meta: server, examples: { minimal } },
    });
    const quickstart = composeQuickstart(server, minimal);
    assert.deepEqual(snippets, [
      { code: quickstart.install, language: 'bash' },
      { code: quickstart.integrated, language: 'typescript' },
      { code: JSON.stringify(quickstart.flow, null, 2), language: 'json' },
    ]);
  });

  test('renders the named export of a package with several exports', async () => {
    const meta = {
      ...$meta,
      package: '@walkeros/server-destination-z',
      platform: ['server'],
      exports: { destinationOne: 'One', destinationTwo: 'Two' },
    };
    const data = {
      $meta: meta,
      examples: {},
      exportExamples: {
        destinationOne: { minimal: { settings: { topic: 'one' } } },
        destinationTwo: { minimal: { settings: { topic: 'two' } } },
      },
    };
    const Content = await partial('_quickstart.mdx');
    const { snippets } = render(Content, { data, export: 'destinationTwo' });
    assert.match(
      snippets[1].code,
      /import \{ destinationTwo \} from '@walkeros\/server-destination-z';/,
    );
    assert.match(snippets[1].code, /topic: 'two'/);
    assert.match(snippets[2].code, /"import": "destinationTwo"/);
    assert.throws(() => render(Content, { data }), /has several exports/);
  });

  test('fails the render, naming the package, without a minimal example', async () => {
    const Content = await partial('_quickstart.mdx');
    assert.throws(
      () => render(Content, { data: { $meta, examples: {} } }),
      /@walkeros\/web-destination-x has no minimal example/,
    );
  });
});

describe('Configuration partial: When it fails', () => {
  const failure = {
    public: false,
    title: 'Missing user',
    description: 'Without a user id the vendor gets nothing.',
    in: { name: 'page view', user: { email: 'fixture-in@example.com' } },
    outcome: { status: 'failed', code: 'missing-input' },
  };
  const data = (step) => ({ $meta, schemas: {}, examples: { step } });

  test('lists each failure example by title, description and outcome, never its input', async () => {
    const { html } = render(await partial('_configuration.mdx'), {
      type: 'destination',
      data: data({ pageView: { in: { name: 'page view' } }, failure }),
    });
    assert.match(html, /<h2>When it fails<\/h2>/);
    assert.match(html, /Missing user/);
    assert.match(html, /Without a user id the vendor gets nothing\./);
    assert.match(html, /<code>failed<\/code>/);
    assert.match(html, /<code>missing-input<\/code>/);
    assert.doesNotMatch(html, /fixture-in@example\.com/);
  });

  test('has no section without a failure example', async () => {
    const { html } = render(await partial('_configuration.mdx'), {
      type: 'destination',
      data: data({ pageView: { in: { name: 'page view' } } }),
    });
    assert.doesNotMatch(html, /When it fails/);
  });

  test('fails the render for a failure example without a description, naming it', async () => {
    const { description, ...undescribed } = failure;
    const Content = await partial('_configuration.mdx');
    assert.throws(
      () =>
        render(Content, {
          type: 'destination',
          data: data({ undescribed }),
        }),
      /failure example undescribed of @walkeros\/web-destination-x has no description/,
    );
  });
});
