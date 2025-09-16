import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs-extra';
import { Config } from './config.js';
import { downloadPackages } from './package-manager.js';
import chalk from 'chalk';

const TEMP_DIR = path.join(process.cwd(), '.temp');

export async function bundle(config: Config): Promise<void> {
  try {
    // Step 1: Prepare temporary directory
    await fs.emptyDir(TEMP_DIR);
    console.log(chalk.gray('  Cleaned temporary directory'));

    // Step 2: Download packages
    console.log(chalk.blue('📥 Downloading packages...'));
    const packagePaths = await downloadPackages(
      config.packages,
      path.join(TEMP_DIR, 'node_modules'),
    );

    // Step 3: Create entry point
    console.log(chalk.blue('📝 Creating entry point...'));
    const entryContent = createEntryPoint(config, packagePaths);
    const entryPath = path.join(TEMP_DIR, 'entry.js');
    await fs.writeFile(entryPath, entryContent);

    // Step 4: Bundle with esbuild
    console.log(chalk.blue('⚡ Bundling with esbuild...'));
    const outputPath = path.join(config.output.dir, config.output.filename);

    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      outfile: outputPath,
      treeShaking: true,
      nodePaths: [path.join(TEMP_DIR, 'node_modules')],
      logLevel: 'error',
      // Define empty modules for Node.js built-ins
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      external: [],
      resolveExtensions: ['.js', '.ts', '.mjs', '.json'],
    });

    console.log(chalk.gray(`  Output: ${outputPath}`));

    // Step 5: Cleanup
    await fs.remove(TEMP_DIR);
    console.log(chalk.gray('  Cleaned up temporary files'));
  } catch (error) {
    // Cleanup on error
    await fs.remove(TEMP_DIR).catch(() => {});
    throw error;
  }
}

function createEntryPoint(
  config: Config,
  packagePaths: Map<string, string>,
): string {
  const imports: string[] = [];
  const exports: string[] = [];

  // Generate imports for each package
  config.packages.forEach((pkg, index) => {
    const varName = `pkg${index}`;
    const packagePath = packagePaths.get(pkg.name);

    if (packagePath) {
      // Read package.json to find main entry
      const packageJson = fs.readJsonSync(
        path.join(packagePath, 'package.json'),
      );

      // For browser bundling, prefer browser field, then module, then main
      let mainFile = packageJson.main || 'index.js';

      // Check for browser-specific exports
      if (packageJson.browser) {
        if (typeof packageJson.browser === 'string') {
          mainFile = packageJson.browser;
        } else if (packageJson.browser['.']) {
          mainFile = packageJson.browser['.'];
        }
      } else if (packageJson.module) {
        // Use ES module version if available and no browser field
        mainFile = packageJson.module;
      }

      imports.push(
        `import * as ${varName} from '${path.join(packagePath, mainFile)}';`,
      );
      // Sanitize package name for JavaScript variable
      const sanitizedName = pkg.name.replace(/[@/-]/g, '_');
      exports.push(`export const ${sanitizedName} = ${varName};`);
    }
  });

  // Combine imports, custom code, and exports
  return `
${imports.join('\n')}

// Custom code
${config.customCode}

// Package exports
${exports.join('\n')}
  `.trim();
}
