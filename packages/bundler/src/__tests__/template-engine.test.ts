import fs from 'fs-extra';
import path from 'path';
import { TemplateEngine } from '../template-engine';
import { TemplateConfigSchema } from '../config';

describe('TemplateEngine', () => {
  const testDir = 'test-templates';
  const engine = new TemplateEngine();

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Inline Templates', () => {
    it('should process inline template with variables', async () => {
      const config = TemplateConfigSchema.parse({
        content: 'Hello {{NAME}}, version {{VERSION}}!',
        variables: { NAME: 'World', VERSION: '1.0.0' },
      });

      const result = await engine.process(config, 'console.log("test");');

      expect(result).toBe('Hello World, version 1.0.0!\nconsole.log("test");');
    });

    it('should replace bundle placeholder', async () => {
      const config = TemplateConfigSchema.parse({
        content: 'Start\n{{CONTENT}}\nEnd',
      });
      const result = await engine.process(config, 'const x = 42;');

      expect(result).toBe('Start\nconst x = 42;\nEnd');
    });

    it('should remove missing variables (Handlebars behavior)', async () => {
      const config = TemplateConfigSchema.parse({
        content: '{{CONTENT}} - {{MISSING}}',
        variables: { EXISTS: 'yes' },
      });
      const result = await engine.process(config, 'code');

      expect(result).toBe('code - ');
    });
  });

  describe('File Templates', () => {
    it('should load and process file template', async () => {
      const templatePath = path.join(testDir, 'test.template');
      await fs.writeFile(templatePath, '{{NAME}}: {{CONTENT}}');

      const config = TemplateConfigSchema.parse({
        file: templatePath,
        variables: { NAME: 'Library' },
      });
      const result = await engine.process(config, 'export const test = 1;');

      expect(result).toBe('Library: export const test = 1;');
    });

    it('should handle custom content placeholder', async () => {
      const config = TemplateConfigSchema.parse({
        content: 'Start [CODE] End',
        contentPlaceholder: '[CODE]',
      });
      const result = await engine.process(config, 'const x = 1;');

      expect(result).toBe('Start const x = 1; End');
    });

    it('should handle custom variable patterns', async () => {
      const config = TemplateConfigSchema.parse({
        content: 'Hello <NAME>!',
        variables: { NAME: 'Test' },
        variablePattern: { prefix: '<', suffix: '>' },
      });
      const result = await engine.process(config, 'code');

      expect(result).toBe('Hello Test!\ncode');
    });
  });

  describe('Array Loop Processing', () => {
    it('should process simple array loop with object properties', async () => {
      const config = TemplateConfigSchema.parse({
        content:
          '{{#imports}}import { {{name}} } from "{{path}}";\\n{{/imports}}',
        variables: {
          imports: [
            { name: 'getId', path: '@walkeros/core' },
            { name: 'trim', path: '@walkeros/utils' },
          ],
        },
      });

      const result = await engine.process(config, 'const bundle = true;');

      expect(result).toBe(
        'import { getId } from "@walkeros/core";\\nimport { trim } from "@walkeros/utils";\\n\nconst bundle = true;',
      );
    });

    it('should process primitive array loop with current item access', async () => {
      const config = TemplateConfigSchema.parse({
        content: '{{#tags}}Tag: {{this}}\\n{{/tags}}',
        variables: {
          tags: ['react', 'typescript', 'bundler'],
        },
      });

      const result = await engine.process(config, 'code');

      expect(result).toBe(
        'Tag: react\\nTag: typescript\\nTag: bundler\\n\ncode',
      );
    });

    it('should support index access in loops', async () => {
      const config = TemplateConfigSchema.parse({
        content: '{{#items}}Item {{@index}}: {{name}}\\n{{/items}}',
        variables: {
          items: [{ name: 'first' }, { name: 'second' }],
        },
      });

      const result = await engine.process(config, 'bundle');

      expect(result).toBe('Item 0: first\\nItem 1: second\\n\nbundle');
    });

    it('should handle empty arrays', async () => {
      const config = TemplateConfigSchema.parse({
        content: 'Before\\n{{#empty}}Should not appear{{/empty}}\\nAfter',
        variables: { empty: [] },
      });

      const result = await engine.process(config, 'code');

      expect(result).toBe('Before\\n\\nAfter\ncode');
    });

    it('should handle non-array variables in loop syntax', async () => {
      const config = TemplateConfigSchema.parse({
        content: '{{#notArray}}Should not appear{{/notArray}}',
        variables: { notArray: 'string' },
      });

      const result = await engine.process(config, 'code');

      expect(result).toBe('\ncode');
    });

    it('should work with custom variable patterns', async () => {
      const config = TemplateConfigSchema.parse({
        content: '<#items><name>: <value>\\n</items>',
        variables: {
          items: [{ name: 'test', value: '123' }],
        },
        variablePattern: { prefix: '<', suffix: '>' },
      });

      const result = await engine.process(config, 'bundle');

      expect(result).toBe('test: 123\\n\nbundle');
    });

    it('should combine loops with regular variables', async () => {
      const config = TemplateConfigSchema.parse({
        content:
          '// {{title}}\\n{{#imports}}import {{name}};\\n{{/imports}}{{CONTENT}}',
        variables: {
          title: 'My Bundle',
          imports: [{ name: 'utils' }],
        },
      });

      const result = await engine.process(config, 'const code = 1;');

      expect(result).toBe('// My Bundle\\nimport utils;\\nconst code = 1;');
    });

    it('should handle nested object properties', async () => {
      const config = TemplateConfigSchema.parse({
        content: '{{#configs}}{{name}}: {{settings.enabled}}\\n{{/configs}}',
        variables: {
          configs: [
            { name: 'dev', settings: { enabled: true } },
            { name: 'prod', settings: { enabled: false } },
          ],
        },
      });

      const result = await engine.process(config, 'bundle');

      expect(result).toBe('dev: true\\nprod: false\\n\nbundle');
    });
  });

  describe('Edge Cases', () => {
    it('should append code when no bundle placeholder found', async () => {
      const config = TemplateConfigSchema.parse({ content: 'Header only' });
      const result = await engine.process(config, 'const code = true;');

      expect(result).toBe('Header only\nconst code = true;');
    });

    it('should handle minimal template content', async () => {
      const config = TemplateConfigSchema.parse({ content: '{{CONTENT}}' });
      const result = await engine.process(config, 'just code');

      expect(result).toBe('just code');
    });

    it('should handle empty bundle code', async () => {
      const config = TemplateConfigSchema.parse({
        content: 'Template: {{CONTENT}}',
      });
      const result = await engine.process(config, '');

      expect(result).toBe('Template: ');
    });
  });
});
