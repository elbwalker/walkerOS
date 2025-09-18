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
   * Process loop blocks in template
   */
  private processLoops(template: string, config: TemplateConfig): string {
    if (!config.variables) return template;

    const prefix = config.variablePattern?.prefix || '{{';
    const suffix = config.variablePattern?.suffix || '}}';

    let result = template;

    // Find all loop blocks {{#arrayName}}...{{/arrayName}}
    const loopRegex = new RegExp(
      `${this.escapeRegex(prefix)}#(\\w+)${this.escapeRegex(suffix)}([\\s\\S]*?)${this.escapeRegex(prefix)}\\/(\\1)${this.escapeRegex(suffix)}`,
      'g',
    );

    result = result.replace(
      loopRegex,
      (match, arrayName, loopContent, closingName) => {
        const arrayValue = config.variables?.[arrayName];

        if (!Array.isArray(arrayValue)) {
          // If not an array, return empty string or original content
          return '';
        }

        return arrayValue
          .map((item, index) => {
            return this.processLoopItem(
              loopContent,
              item,
              index,
              prefix,
              suffix,
            );
          })
          .join('');
      },
    );

    return result;
  }

  /**
   * Process a single loop item
   */
  private processLoopItem(
    content: string,
    item: unknown,
    index: number,
    prefix: string,
    suffix: string,
  ): string {
    let result = content;

    // Replace {{.}} with current item (for primitive arrays)
    const currentItemPlaceholder = `${prefix}.${suffix}`;
    result = result.replace(
      new RegExp(this.escapeRegex(currentItemPlaceholder), 'g'),
      String(item),
    );

    // Replace {{@index}} with current index
    const indexPlaceholder = `${prefix}@index${suffix}`;
    result = result.replace(
      new RegExp(this.escapeRegex(indexPlaceholder), 'g'),
      String(index),
    );

    // Replace object properties like {{name}}, {{path}}, etc.
    if (typeof item === 'object' && item !== null) {
      // Handle simple properties first
      for (const [key, value] of Object.entries(item)) {
        const placeholder = `${prefix}${key}${suffix}`;
        result = result.replace(
          new RegExp(this.escapeRegex(placeholder), 'g'),
          String(value),
        );
      }

      // Handle nested dot notation like {{settings.enabled}}
      const nestedRegex = new RegExp(
        `${this.escapeRegex(prefix)}([\\w.]+)${this.escapeRegex(suffix)}`,
        'g',
      );
      result = result.replace(nestedRegex, (match, path) => {
        if (path.includes('.')) {
          const value = this.getNestedValue(item, path);
          return value !== undefined ? String(value) : match;
        }
        return match; // Let simple properties be handled above
      });
    }

    return result;
  }

  /**
   * Get nested object value using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      return current &&
        typeof current === 'object' &&
        current !== null &&
        key in current
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    // First, process loop blocks
    result = this.processLoops(result, config);

    // Replace bundle placeholder (or append if not found)
    const bundlePlaceholder = config.bundlePlaceholder || '{{BUNDLE}}';
    if (result.includes(bundlePlaceholder)) {
      result = result.replace(bundlePlaceholder, bundleCode);
    } else {
      // No bundle placeholder? Just append the code
      result = result + '\n' + bundleCode;
    }

    // Replace simple variables if provided
    if (config.variables) {
      const prefix = config.variablePattern?.prefix || '{{';
      const suffix = config.variablePattern?.suffix || '}}';

      for (const [key, value] of Object.entries(config.variables)) {
        // Skip arrays as they are handled by loop processing
        if (Array.isArray(value)) continue;

        const placeholder = `${prefix}${key}${suffix}`;
        const regex = new RegExp(this.escapeRegex(placeholder), 'g');
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
