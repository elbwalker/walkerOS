import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import type { SourceDestinationItem } from '../../types/template';
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
   * Apply template with user code and variable substitution
   */
  applyTemplate(
    template: string,
    userCode: string,
    sources: Record<string, SourceDestinationItem>,
    destinations: Record<string, SourceDestinationItem>,
    collector: Record<string, unknown>,
    build?: Record<string, unknown>,
  ): string {
    // Process template variables to serialize config objects
    const processedVariables = processTemplateVariables({
      sources,
      destinations,
      collector,
    });

    // Prepare template data for Handlebars
    const templateData: Record<string, unknown> = {
      CODE: userCode,
      build: build || {},
      ...processedVariables,
    };

    // Compile and execute the template
    const compiledTemplate = this.handlebars.compile(template);
    return compiledTemplate(templateData);
  }

  /**
   * Process template with user code
   */
  async process(
    templatePath: string,
    userCode: string,
    sources: Record<string, SourceDestinationItem>,
    destinations: Record<string, SourceDestinationItem>,
    collector: Record<string, unknown>,
    build?: Record<string, unknown>,
  ): Promise<string> {
    const template = await this.loadTemplate(templatePath);
    return this.applyTemplate(
      template,
      userCode,
      sources,
      destinations,
      collector,
      build,
    );
  }
}
