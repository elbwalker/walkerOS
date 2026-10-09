/**
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
// sass compiles files only in its Node build, which these conditions select.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  compilePreviewComponents,
  loadDesignTokens,
  renderPreviewModule,
  renderTokensCss,
} from '../generate';
import { previewDesignCss } from '../preview-css';

const packageDir = resolve(__dirname, '../../..');
const read = (path: string) => readFileSync(resolve(packageDir, path), 'utf8');

it('src/design/preview-css.ts is the generator output (run `npm run build` in apps/explorer to refresh it)', () => {
  expect(read('src/design/preview-css.ts')).toBe(
    renderPreviewModule(
      loadDesignTokens(packageDir),
      read('src/design/base.css'),
      compilePreviewComponents(packageDir),
    ),
  );
});

it('carries the tokens, the base rules and the design components a demo page is built from', () => {
  expect(
    previewDesignCss.startsWith(renderTokensCss(loadDesignTokens(packageDir))),
  ).toBe(true);
  expect(previewDesignCss).toContain(read('src/design/base.css'));
  for (const selector of [
    '.elb-photo--viz',
    '.elb-btn--primary',
    '.elb-btn--secondary',
    '.elb-card--pad-sm',
    '.elb-text--fg',
  ])
    expect(previewDesignCss).toContain(selector);
  // Only those: a new design component does not change the preview.
  expect(previewDesignCss).not.toContain('.elb-eyebrow');
});

it('stays out of @walkeros/explorer/design', () => {
  expect(read('src/design/index.ts')).not.toMatch(
    /preview-css|previewDesignCss/,
  );
});
