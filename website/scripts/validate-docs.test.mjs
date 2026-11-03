import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Run with tsx: the doc-lint is TypeScript.
const ROOT = new URL('../..', import.meta.url).pathname;
const {
  findFlowJsonSchemaIssues,
  findHandWrittenQuickstart,
  findMissingQuickstart,
  findPackageMismatch,
  flowSnippetPage,
} = await import(`${ROOT}apps/scripts/validate-docs.ts`);

const FRONTMATTER = `---
title: X
package: '@walkeros/web-destination-x'
---
import data from '@walkeros/web-destination-x/walkerOS.json';
`;

describe('doc-lint: hand-written quickstart copies', () => {
  const page = `${FRONTMATTER}
## Installation

<CodeSnippet
  code={\`npm install @walkeros/web-destination-x\`}
  language="bash"
/>

<Tabs groupId="mode">
  <TabItem value="integrated" label="Integrated" default>

<CodeSnippet
  code={\`import { startFlow } from '@walkeros/collector';

await startFlow({ destinations: {} });\`}
  language="typescript"
/>

  </TabItem>
  <TabItem value="bundled" label="Bundled">

\`\`\`json
{ "destinations": {} }
\`\`\`

  </TabItem>
</Tabs>
`;

  test('reports the install, integrated and bundled copies on a page whose package has a minimal example', () => {
    assert.deepEqual(findHandWrittenQuickstart(page, true), [10, 18, 25]);
  });

  test('reports nothing while the package has no minimal example', () => {
    assert.deepEqual(findHandWrittenQuickstart(page, false), []);
  });

  test('reports nothing outside the Installation section', () => {
    const feature = `${page}
## Usage

\`\`\`ts
await startFlow({ destinations: { x: { code: destinationX } } });
\`\`\`
`;
    assert.deepEqual(findHandWrittenQuickstart(feature, true), [10, 18, 25]);
  });

  test('reports nothing on a page that renders the quickstart', () => {
    const rendered = `${FRONTMATTER}
## Installation

<Quickstart data={data} />

A tab shown as text is no tab: \`<TabItem value="bundled">\`.
`;
    assert.deepEqual(findHandWrittenQuickstart(rendered, true), []);
  });
});

describe('doc-lint: a page whose package has a minimal example renders it', () => {
  const installation = (body) =>
    `${FRONTMATTER}\n## Installation\n\n${body}\n\n## Usage\n\n<Quickstart data={data} />\n`;

  test('reports the Installation heading when its section renders no quickstart', () => {
    assert.deepEqual(
      findMissingQuickstart(installation('Install the package.'), true),
      [7],
    );
  });

  test('reports nothing when Installation renders the quickstart, or the package has no minimal example', () => {
    assert.deepEqual(
      findMissingQuickstart(installation('<Quickstart data={data} />'), true),
      [],
    );
    assert.deepEqual(
      findMissingQuickstart(installation('Install the package.'), false),
      [],
    );
  });

  test('reports line 1 for a page without an Installation section', () => {
    assert.deepEqual(findMissingQuickstart(FRONTMATTER, true), [1]);
  });
});

describe('doc-lint: frontmatter package and imported walkerOS.json', () => {
  test('reports an import of another package', () => {
    const page = FRONTMATTER.replace(
      "'@walkeros/web-destination-x/walkerOS.json'",
      "'@walkeros/web-destination-y/walkerOS.json'",
    );
    assert.deepEqual(findPackageMismatch(page), [5]);
  });

  test('reports nothing when both name the same package, or no package is named', () => {
    assert.deepEqual(findPackageMismatch(FRONTMATTER), []);
    assert.deepEqual(
      findPackageMismatch(
        "import data from '@walkeros/web-destination-y/walkerOS.json';\n",
      ),
      [],
    );
  });
});

describe('doc-lint: flow snippets, fragments included', () => {
  const json = (code) => '```json\n' + code + '\n```\n';
  const bundled = `"destinations": {
  "api": {
    "package": "@walkeros/web-destination-api",
    "config": { "settings": { "url": "$secret.API_URL" } }
  }
}`;
  const mapping = `"mapping": {
  "order": { "complete": { "data": { "total": "data.total" } } }
}`;
  const page = {
    platform: 'web',
    step: { type: 'destination', package: '@walkeros/web-destination-x' },
  };

  test('checks a fragment that starts at "destinations" inside a v4 flow on the page platform', () => {
    const report = findFlowJsonSchemaIssues(json(bundled), { platform: 'web' });
    assert.equal(report.checked, 1);
    assert.equal(report.fragments, 1);
    assert.deepEqual(
      report.findings.map((f) => f.line),
      [1],
    );
    assert.match(report.findings[0].message, /cannot be used in a web flow/);
  });

  test('takes the platform from the fragment before the page', () => {
    const server = `"config": { "platform": "server" },\n${bundled}`;
    const report = findFlowJsonSchemaIssues(json(server), { platform: 'web' });
    assert.deepEqual(report.findings, []);
    assert.equal(report.checked, 1);
  });

  test('fails an unknown key inside a fragment', () => {
    const typo = `"destinations": {
  "api": { "package": "@walkeros/web-destination-api", "settingz": {} }
}`;
    assert.deepEqual(
      findFlowJsonSchemaIssues(json(typo), {}).findings.map((f) => f.path),
      ['flows.default.destinations.api.settingz'],
    );
  });

  test('fails a json fragment of a flow that does not parse', () => {
    const broken = '"stores": { "files": { "cache": { "rules": [...] } } }';
    assert.deepEqual(
      findFlowJsonSchemaIssues(json(broken), {}).findings.map((f) => f.line),
      [1],
    );
  });

  test('checks a step config fragment as the step of the package the page names', () => {
    const report = findFlowJsonSchemaIssues(json(mapping), page);
    assert.equal(report.checked, 1);
    assert.deepEqual(
      report.findings.map((f) => f.path),
      ['flows.default.destinations.step.config.mapping.order.complete.data'],
    );
  });

  test('checks a step entry under its name when it names the package the page names', () => {
    const named = `"x": {
  "package": "@walkeros/web-destination-x",
  "config": { "settingz": {} }
}`;
    assert.deepEqual(
      findFlowJsonSchemaIssues(json(named), page).findings.map((f) => f.path),
      ['flows.default.destinations.x.config.settingz'],
    );
  });

  test('skips and counts a fragment that is not a flow part when the page names no package', () => {
    const report = findFlowJsonSchemaIssues(
      json(mapping) +
        json('{ "name": "page view" }') +
        json('"async": false // every request synchronous'),
      {},
    );
    assert.deepEqual(report.findings, []);
    assert.equal(report.checked, 0);
    assert.equal(report.skipped, 3);
  });

  test('skips and counts a block that declares version 3', () => {
    const v3 = '{ "version": 3, "flows": { "default": { "web": {} } } }';
    const report = findFlowJsonSchemaIssues(json(v3), {});
    assert.deepEqual(report.findings, []);
    assert.equal(report.checked, 0);
    assert.equal(report.skippedVersion3, 1);
  });

  test('counts a checked snippet with a package step as schema-level', () => {
    const report = findFlowJsonSchemaIssues(json(bundled), {
      platform: 'server',
    });
    assert.deepEqual(report.findings, []);
    assert.equal(report.schemaLevel, 1);
  });

  test('reads the platform from the page path and the step from the frontmatter package', () => {
    const packages = new Map([
      ['@walkeros/web-destination-x', { dir: '/x', type: 'destination' }],
    ]);
    assert.deepEqual(
      flowSnippetPage(
        'website/docs/destinations/web/x.mdx',
        FRONTMATTER,
        packages,
      ),
      page,
    );
    assert.deepEqual(
      flowSnippetPage('website/docs/guides/x.mdx', '', packages),
      {},
    );
  });
});
