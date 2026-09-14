import { hints } from '../hints';
import { SettingsSchema } from '../schemas/settings';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The bot settings a flow-shaped hint example configures, when it shows any. */
const settingsOf = (json: string): unknown => {
  let node: unknown = JSON.parse(json);
  for (const key of ['transformers', 'bot', 'config', 'settings']) {
    if (!isRecord(node)) return undefined;
    node = node[key];
  }
  return node;
};

const jsonBlocks = Object.entries(hints).flatMap(([name, hint]) =>
  (hint.code ?? [])
    .filter((block) => block.lang === 'json')
    .map((block, index) => [`${name} block ${index}`, block.code] as const),
);

const settingsBlocks = jsonBlocks.filter(
  ([, code]) => settingsOf(code) !== undefined,
);

describe('hint examples', () => {
  it('shows bot settings somewhere', () => {
    expect(settingsBlocks.length).toBeGreaterThan(0);
  });

  // A hint is the copy-paste path into a flow config, so an example the shipped
  // schema rejects is a wrong answer handed to whoever asked for help.
  it.each(settingsBlocks)(
    '%s configures settings the schema accepts',
    (_, code) => {
      expect(SettingsSchema.safeParse(settingsOf(code))).toMatchObject({
        success: true,
      });
    },
  );
});
