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
        content: 'Start\n{{BUNDLE}}\nEnd',
      });
      const result = await engine.process(config, 'const x = 42;');

      expect(result).toBe('Start\nconst x = 42;\nEnd');
    });

    it('should leave missing variables unchanged', async () => {
      const config = TemplateConfigSchema.parse({
        content: '{{BUNDLE}} - {{MISSING}}',
        variables: { EXISTS: 'yes' },
      });
      const result = await engine.process(config, 'code');

      expect(result).toBe('code - {{MISSING}}');
    });
  });

  describe('File Templates', () => {
    it('should load and process file template', async () => {
      const templatePath = path.join(testDir, 'test.template');
      await fs.writeFile(templatePath, '{{NAME}}: {{BUNDLE}}');

      const config = TemplateConfigSchema.parse({
        file: templatePath,
        variables: { NAME: 'Library' },
      });
      const result = await engine.process(config, 'export const test = 1;');

      expect(result).toBe('Library: export const test = 1;');
    });

    it('should handle custom bundle placeholder', async () => {
      const config = TemplateConfigSchema.parse({
        content: 'Start [CODE] End',
        bundlePlaceholder: '[CODE]',
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

  describe('Edge Cases', () => {
    it('should append code when no bundle placeholder found', async () => {
      const config = TemplateConfigSchema.parse({ content: 'Header only' });
      const result = await engine.process(config, 'const code = true;');

      expect(result).toBe('Header only\nconst code = true;');
    });

    it('should handle minimal template content', async () => {
      const config = TemplateConfigSchema.parse({ content: '{{BUNDLE}}' });
      const result = await engine.process(config, 'just code');

      expect(result).toBe('just code');
    });

    it('should handle empty bundle code', async () => {
      const config = TemplateConfigSchema.parse({
        content: 'Template: {{BUNDLE}}',
      });
      const result = await engine.process(config, '');

      expect(result).toBe('Template: ');
    });
  });
});
