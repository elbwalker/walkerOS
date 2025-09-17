import fs from 'fs-extra';
import path from 'path';
import { TemplateConfig } from './config.js';

export class TemplateEngine {
  /**
   * Load template content from configuration
   */
  async loadTemplate(config: TemplateConfig): Promise<string> {
    if (config.content) {
      return config.content;
    }

    if (config.file) {
      const templatePath = path.resolve(config.file);

      if (!(await fs.pathExists(templatePath))) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      return await fs.readFile(templatePath, 'utf-8');
    }

    throw new Error('Template configuration must have either content or file');
  }

  /**
   * Apply template with bundle code and variable substitution
   */
  applyTemplate(
    template: string,
    bundleCode: string,
    config: TemplateConfig,
  ): string {
    let result = template;

    // Replace bundle placeholder (or append if not found)
    const bundlePlaceholder = config.bundlePlaceholder || '{{BUNDLE}}';
    if (result.includes(bundlePlaceholder)) {
      result = result.replace(bundlePlaceholder, bundleCode);
    } else {
      // No bundle placeholder? Just append the code
      result = result + '\n' + bundleCode;
    }

    // Replace variables if provided
    if (config.variables) {
      const prefix = config.variablePattern?.prefix || '{{';
      const suffix = config.variablePattern?.suffix || '}}';

      for (const [key, value] of Object.entries(config.variables)) {
        const placeholder = `${prefix}${key}${suffix}`;
        const regex = new RegExp(
          placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'g',
        );
        result = result.replace(regex, String(value));
      }
    }

    // Any remaining placeholders are left as-is (no failure)
    return result;
  }

  /**
   * Process template with bundle code
   */
  async process(config: TemplateConfig, bundleCode: string): Promise<string> {
    const template = await this.loadTemplate(config);
    return this.applyTemplate(template, bundleCode, config);
  }
}
