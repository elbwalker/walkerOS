import '../support/version.js';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerReferenceResources } from '../../resources/references.js';

interface RegisteredResource {
  uri: string;
  config: unknown;
  readCallback: (...args: unknown[]) => Promise<{
    contents: Array<{ uri: string; text: string; mimeType: string }>;
  }>;
}

function createMockServer() {
  const resources: Record<string, RegisteredResource> = {};
  return {
    server: {
      resource(
        name: string,
        uri: string,
        config: unknown,
        readCallback: RegisteredResource['readCallback'],
      ) {
        resources[name] = { uri, config, readCallback };
      },
    },
    getResource(name: string) {
      return resources[name];
    },
  };
}

// Read the real bundled spec the build embeds, to assert the resource serves it.
// resources -> __tests__ -> src -> mcp -> mcps -> packages, then into cli.
const here = dirname(fileURLToPath(import.meta.url));
const specPath = join(here, '../../../../../cli/openapi/spec.json');
interface SpecShape {
  info: { version: string };
}
function parseSpec(text: string): SpecShape {
  const parsed: unknown = JSON.parse(text);
  if (
    parsed &&
    typeof parsed === 'object' &&
    'info' in parsed &&
    parsed.info &&
    typeof parsed.info === 'object' &&
    'version' in parsed.info &&
    typeof parsed.info.version === 'string'
  ) {
    return { info: { version: parsed.info.version } };
  }
  throw new Error('spec.json missing info.version');
}
const bundledSpec = parseSpec(readFileSync(specPath, 'utf-8'));

describe('openapi reference resource serves the embedded bundled spec', () => {
  it('returns the real spec with info.version, not the error fallback', async () => {
    const { server, getResource } = createMockServer();
    registerReferenceResources(server as never);

    const resource = getResource('openapi');
    expect(resource).toBeDefined();

    const result = await resource.readCallback();
    const text = result.contents[0].text;

    expect(text).not.toContain('not found');

    const parsed = parseSpec(text);
    expect(parsed.info.version).toBeDefined();
    expect(parsed.info.version).toBe(bundledSpec.info.version);
  });
});
