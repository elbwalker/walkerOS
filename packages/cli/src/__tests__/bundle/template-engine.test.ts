import fs from 'fs-extra';
import path from 'path';
import { TemplateEngine } from '../../bundle/template-engine';
import { SourceDestinationItem } from '../../bundle/config';
import { getId } from '@walkeros/core';

describe('TemplateEngine', () => {
  const testOutputDir = path.join('.tmp', `template-${Date.now()}-${getId()}`);
  const engine = new TemplateEngine();

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
  });

  describe('Templates', () => {
    it('should process template with sources and destinations', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(
        templatePath,
        '{{CONTENT}}\nSources: {{#each sources}}{{@key}} {{/each}}\nDestinations: {{#each destinations}}{{@key}} {{/each}}',
      );

      const sources = {
        browser: { code: 'sourceBrowser', config: {} } as SourceDestinationItem,
      };
      const destinations = {
        gtag: { code: 'destinationGtag', config: {} } as SourceDestinationItem,
      };
      const collector = {};

      const result = await engine.process(
        templatePath,
        'console.log("test");',
        sources,
        destinations,
        collector,
      );

      expect(result).toContain('console.log("test");');
      expect(result).toContain('Sources: browser');
      expect(result).toContain('Destinations: gtag');
    });

    it('should replace bundle placeholder', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(templatePath, 'Start\n{{CONTENT}}\nEnd');

      const result = await engine.process(
        templatePath,
        'const x = 42;',
        {},
        {},
        {},
      );

      expect(result).toBe('Start\nconst x = 42;\nEnd');
    });

    it('should handle missing variables gracefully', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(templatePath, '{{CONTENT}} - {{MISSING}}');

      const result = await engine.process(templatePath, 'code', {}, {}, {});

      expect(result).toBe('code - ');
    });

    it('should handle config serialization', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(
        templatePath,
        '{{CONTENT}}\n{{#each sources}}Code: {{{code}}}, Config: {{{config}}}\n{{/each}}',
      );

      const sources = {
        browser: {
          code: 'sourceBrowser',
          config: { settings: { prefix: 'data-elb' } },
        } as SourceDestinationItem,
      };

      const result = await engine.process(
        templatePath,
        'const test = true;',
        sources,
        {},
        {},
      );

      expect(result).toContain('Code: sourceBrowser');
      expect(result).toContain('Config: {');
      expect(result).toContain('prefix');
    });
  });

  describe('Object Iteration', () => {
    it('should iterate over sources and destinations objects', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(
        templatePath,
        '{{#each sources}}Source {{@key}}: {{code}}\n{{/each}}{{#each destinations}}Destination {{@key}}: {{code}}\n{{/each}}{{CONTENT}}',
      );

      const sources = {
        browser: { code: 'sourceBrowser' } as SourceDestinationItem,
        dataLayer: { code: 'sourceDataLayer' } as SourceDestinationItem,
      };
      const destinations = {
        gtag: { code: 'destinationGtag' } as SourceDestinationItem,
        api: { code: 'destinationAPI' } as SourceDestinationItem,
      };

      const result = await engine.process(
        templatePath,
        'const bundle = true;',
        sources,
        destinations,
        {},
      );

      expect(result).toContain('Source browser: sourceBrowser');
      expect(result).toContain('Source dataLayer: sourceDataLayer');
      expect(result).toContain('Destination gtag: destinationGtag');
      expect(result).toContain('Destination api: destinationAPI');
      expect(result).toContain('const bundle = true;');
    });

    it('should handle collector configuration', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(
        templatePath,
        '{{CONTENT}}{{#if collector}}\nCollector: {{{collector}}}{{/if}}',
      );

      const collector = { settings: { debug: true } };

      const result = await engine.process(
        templatePath,
        'const code = 1;',
        {},
        {},
        collector,
      );

      expect(result).toContain('const code = 1;');
      expect(result).toContain('Collector: {');
      expect(result).toContain('debug');
    });
  });

  describe('Edge Cases', () => {
    it('should append code when no bundle placeholder found', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(templatePath, 'Header only');

      const result = await engine.process(
        templatePath,
        'const code = true;',
        {},
        {},
        {},
      );

      expect(result).toBe('Header only\nconst code = true;');
    });

    it('should handle minimal template content', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(templatePath, '{{CONTENT}}');

      const result = await engine.process(
        templatePath,
        'just code',
        {},
        {},
        {},
      );

      expect(result).toBe('just code');
    });

    it('should handle empty bundle code', async () => {
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(templatePath, 'Template: {{CONTENT}}');

      const result = await engine.process(templatePath, '', {}, {}, {});

      expect(result).toBe('Template: ');
    });
  });
});
