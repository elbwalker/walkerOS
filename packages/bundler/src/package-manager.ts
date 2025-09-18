import pacote from 'pacote';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export interface Package {
  name: string;
  version: string;
}

function createLogger(silent: boolean) {
  return (...args: Parameters<typeof console.log>) => {
    if (!silent) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  };
}

function validateNoDuplicatePackages(packages: Package[]): void {
  const packageMap = new Map<string, string[]>();

  // Group packages by name and collect their versions
  for (const pkg of packages) {
    if (!packageMap.has(pkg.name)) {
      packageMap.set(pkg.name, []);
    }
    packageMap.get(pkg.name)!.push(pkg.version);
  }

  // Check for duplicate packages with different versions
  const conflicts: string[] = [];
  for (const [name, versions] of packageMap.entries()) {
    const uniqueVersions = [...new Set(versions)];
    if (uniqueVersions.length > 1) {
      conflicts.push(`${name}: [${uniqueVersions.join(', ')}]`);
    }
  }

  if (conflicts.length > 0) {
    throw new Error(
      `Version conflicts detected:\n${conflicts.map((c) => `  - ${c}`).join('\n')}\n\n` +
        'Each package must use the same version across all declarations. ' +
        'Please update your configuration to use consistent versions.',
    );
  }
}

export async function downloadPackages(
  packages: Package[],
  targetDir: string,
  silent = false,
): Promise<Map<string, string>> {
  const packagePaths = new Map<string, string>();
  const log = createLogger(silent);

  // Validate no duplicate packages with different versions
  validateNoDuplicatePackages(packages);

  // Ensure target directory exists
  await fs.ensureDir(targetDir);

  for (const pkg of packages) {
    const packageSpec = `${pkg.name}@${pkg.version}`;
    const packageDir = path.join(targetDir, pkg.name.replace('/', '-'));

    log(chalk.gray(`  Downloading ${packageSpec}...`));

    try {
      // Extract package to target directory
      await pacote.extract(packageSpec, packageDir, {
        cache: path.join(process.cwd(), '.npm-cache'),
      });

      packagePaths.set(pkg.name, packageDir);
    } catch (error) {
      throw new Error(`Failed to download ${packageSpec}: ${error}`);
    }
  }

  return packagePaths;
}
