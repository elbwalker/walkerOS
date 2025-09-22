import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { TemplateConfig } from './config';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    // Create a new Handlebars instance
    this.handlebars = Handlebars.create();
  }

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
    let processedTemplate = template;

    // Handle custom variable patterns by converting them to standard Handlebars syntax
    if (config.variablePattern) {
      const { prefix, suffix } = config.variablePattern;
      if (prefix !== '{{' || suffix !== '}}') {
        // Convert custom patterns to Handlebars syntax
        const customRegex = new RegExp(
          `${this.escapeRegex(prefix)}([\\w.#/@]+)${this.escapeRegex(suffix)}`,
          'g',
        );
        processedTemplate = processedTemplate.replace(customRegex, '{{$1}}');
      }
    }

    // Replace content placeholder with bundle code first
    const contentPlaceholder = config.contentPlaceholder || '{{CONTENT}}';
    const templateWithContent = processedTemplate.includes(contentPlaceholder)
      ? processedTemplate.replace(contentPlaceholder, bundleCode)
      : processedTemplate + '\n' + bundleCode;

    // Prepare template data for Handlebars
    const templateData: Record<string, unknown> = {
      CONTENT: bundleCode,
      ...config.variables,
    };

    // Clean up the data - convert non-arrays used in loop syntax to empty arrays
    // This makes Handlebars behave like our old custom engine
    if (config.variables) {
      for (const [key, value] of Object.entries(config.variables)) {
        // Check if this variable is used in loop syntax in the template
        const loopRegex = new RegExp(`{{#${key}}}`, 'g');
        if (loopRegex.test(templateWithContent) && !Array.isArray(value)) {
          // Convert non-array to empty array for loops
          templateData[key] = [];
        }
      }
    }

    // Compile and execute the template
    const compiledTemplate = this.handlebars.compile(templateWithContent);
    return compiledTemplate(templateData);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Process template with bundle code
   */
  async process(config: TemplateConfig, bundleCode: string): Promise<string> {
    const template = await this.loadTemplate(config);
    return this.applyTemplate(template, bundleCode, config);
  }
}
