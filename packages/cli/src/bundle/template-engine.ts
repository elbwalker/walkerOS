import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { SourceDestinationItem } from './config';
import { processTemplateVariables } from './serializer';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    // Create a new Handlebars instance
    this.handlebars = Handlebars.create();
  }

  /**
   * Load template content from file path
   */
  async loadTemplate(templatePath: string): Promise<string> {
    const resolvedPath = path.resolve(templatePath);

    if (!(await fs.pathExists(resolvedPath))) {
      throw new Error(`Template file not found: ${resolvedPath}`);
    }

    return await fs.readFile(resolvedPath, 'utf-8');
  }

  /**
   * Apply template with bundle code and variable substitution
   */
  applyTemplate(
    template: string,
    bundleCode: string,
    sources: Record<string, SourceDestinationItem>,
    destinations: Record<string, SourceDestinationItem>,
    collector: Record<string, unknown>,
  ): string {
    // Replace content placeholder with bundle code first
    const contentPlaceholder = '{{CONTENT}}';
    const templateWithContent = template.includes(contentPlaceholder)
      ? template.replace(contentPlaceholder, bundleCode)
      : template + '\n' + bundleCode;

    // Process template variables to serialize config objects
    const processedVariables = processTemplateVariables({
      sources,
      destinations,
      collector,
    });

    // Prepare template data for Handlebars
    const templateData: Record<string, unknown> = {
      CONTENT: bundleCode,
      ...processedVariables,
    };

    // Compile and execute the template
    const compiledTemplate = this.handlebars.compile(templateWithContent);
    return compiledTemplate(templateData);
  }

  /**
   * Process template with bundle code
   */
  async process(
    templatePath: string,
    bundleCode: string,
    sources: Record<string, SourceDestinationItem>,
    destinations: Record<string, SourceDestinationItem>,
    collector: Record<string, unknown>,
  ): Promise<string> {
    const template = await this.loadTemplate(templatePath);
    return this.applyTemplate(
      template,
      bundleCode,
      sources,
      destinations,
      collector,
    );
  }
}
