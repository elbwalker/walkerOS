import { fetchPackageSchema } from '@walkeros/core';
import { fetchCatalog } from '../catalog.js';
import type { TemplateResourceSpec } from '../knowledge-spec.js';

export const PACKAGE_SCHEMA_RESOURCE: TemplateResourceSpec = {
  kind: 'template',
  name: 'package-schema',
  uriTemplate: 'walkeros://schema/{packageName}',
  title: 'walkerOS Package Schema',
  description: 'JSON Schema and configuration examples for walkerOS packages',
  mimeType: 'application/json',
  async list() {
    const { entries } = await fetchCatalog();
    return entries.map((pkg) => ({
      uri: `walkeros://schema/${encodeURIComponent(pkg.name)}`,
      name: pkg.name,
      description: `Schema and examples for ${pkg.name}`,
      mimeType: 'application/json',
    }));
  },
  async read(variables) {
    const value = variables.packageName;
    const packageName = Array.isArray(value) ? value[0] : value;
    if (!packageName) throw new Error('packageName is required');
    const info = await fetchPackageSchema(decodeURIComponent(packageName));
    return {
      text: JSON.stringify(info, null, 2),
      mimeType: 'application/json',
    };
  },
};
