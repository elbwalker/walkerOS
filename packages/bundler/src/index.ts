import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';
import Handlebars from 'handlebars';
import type { BundlerConfig } from './types/config.js';

// Register helpers
Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

Handlebars.registerHelper('json', function (context) {
  return JSON.stringify(context);
});

export async function bundler(config: BundlerConfig): Promise<string> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Register partials
  const snippetsDir = path.join(__dirname, 'templates', 'snippets');
  const snippetFiles = fs.readdirSync(snippetsDir);

  for (const file of snippetFiles) {
    const name = path.basename(file, '.hbs');
    const content = fs.readFileSync(path.join(snippetsDir, file), 'utf-8');
    Handlebars.registerPartial(`snippets/${name}`, content);
  }

  // Read main template
  const templatePath = path.join(__dirname, 'templates', 'basic.js.hbs');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Compile template with Handlebars
  const compiledTemplate = Handlebars.compile(template);
  const compiledCode = compiledTemplate(config);

  // Bundle with esbuild using stdin
  const result = await esbuild.build({
    stdin: {
      contents: compiledCode,
      loader: 'js',
      resolveDir: path.resolve(__dirname, '..'),
    },
    bundle: true,
    write: false,
    format: 'iife',
    minify: true,
    treeShaking: true,
    platform: 'node', // TODO: Add browser support
    target: 'es2015',
    splitting: false,
    metafile: true, // Helps with tree-shaking analysis
    mainFields: ['module'], // Prefer ESM versions for better tree-shaking
  });

  // Optionally log bundle analysis
  console.log(await esbuild.analyzeMetafile(result.metafile));

  return result.outputFiles[0].text;
}
