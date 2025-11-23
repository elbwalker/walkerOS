import fs from 'fs-extra';
import Handlebars from 'handlebars';
import type { SourceDestinationItem } from '../../types/template';
import { processTemplateVariables } from './serializer';
import { resolveAsset } from '../../core/asset-resolver';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    // Create a new Handlebars instance
    this.handlebars = Handlebars.create();

    // Register equality helper for conditional window assignment
    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  }

  /**
   * Load template content from file path
   *
   * @param templatePath - Template path (bare name, relative, or absolute)
   */
  async loadTemplate(templatePath: string): Promise<string> {
    // Use unified asset resolver (works in both local and Docker)
    const resolvedPath = resolveAsset(templatePath, 'template');

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
