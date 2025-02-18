import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import Handlebars from 'handlebars';

interface BundlerConfig {
  name: string;
  message: string;
}

export async function bundler(config: BundlerConfig): Promise<string> {
  // Get current file's directory path in ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Read template
  const templatePath = path.join(__dirname, 'templates', 'basic.js.hbs');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Compile template with Handlebars
  const compiledTemplate = Handlebars.compile(template);
  const compiledCode = compiledTemplate(config);

  // Bundle with esbuild
  const result = await esbuild.transform(compiledCode, {
    minify: true,
    format: 'iife',
  });

  return result.code;
}
