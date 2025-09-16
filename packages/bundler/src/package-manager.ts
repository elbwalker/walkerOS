import pacote from 'pacote';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export interface Package {
  name: string;
  version: string;
}

export async function downloadPackages(
  packages: Package[],
  targetDir: string,
): Promise<Map<string, string>> {
  const packagePaths = new Map<string, string>();

  // Ensure target directory exists
  await fs.ensureDir(targetDir);

  for (const pkg of packages) {
    const packageSpec = `${pkg.name}@${pkg.version}`;
    const packageDir = path.join(targetDir, pkg.name.replace('/', '-'));

    console.log(chalk.gray(`  Downloading ${packageSpec}...`));

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
