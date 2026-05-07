import { assertConsumerDepsSatisfied } from '../assert-consumer-deps';
import { createMockLogger } from '@walkeros/core';
import fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('assertConsumerDepsSatisfied', () => {
  let tmp: string;
  const logger = createMockLogger();

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'assert-consumer-deps-'));
  });
  afterEach(async () => {
    await fs.remove(tmp);
  });

  async function makePkg(
    dir: string,
    name: string,
    version: string,
    deps: Record<string, string> = {},
  ) {
    await fs.ensureDir(dir);
    await fs.writeJson(path.join(dir, 'package.json'), {
      name,
      version,
      dependencies: deps,
    });
  }

  it('returns no violations when every declared dep resolves to a satisfying version', async () => {
    await makePkg(
      path.join(tmp, 'node_modules', 'consumer'),
      'consumer',
      '1.0.0',
      { dep: '^2.0.0' },
    );
    await makePkg(path.join(tmp, 'node_modules', 'dep'), 'dep', '2.5.0');
    const violations = await assertConsumerDepsSatisfied(tmp, logger);
    expect(violations).toEqual([]);
  });

  it('reports a violation (warns, does not throw) when a dep resolves to a non-satisfying version', async () => {
    await makePkg(
      path.join(tmp, 'node_modules', 'consumer'),
      'consumer',
      '1.0.0',
      { dep: '^2.0.0' },
    );
    await makePkg(path.join(tmp, 'node_modules', 'dep'), 'dep', '3.0.0');
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      const violations = await assertConsumerDepsSatisfied(tmp, logger);
      expect(violations).toHaveLength(1);
      expect(violations[0]).toMatchObject({
        consumerName: 'consumer',
        depName: 'dep',
        declaredRange: '^2.0.0',
        installedVersion: '3.0.0',
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /consumer.*declares dep@\^2\.0\.0.*resolved to 3\.0\.0/i,
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('returns no violations when a nested copy satisfies the consumer (sibling resolution)', async () => {
    await makePkg(
      path.join(tmp, 'node_modules', 'consumer'),
      'consumer',
      '1.0.0',
      { dep: '^2.0.0' },
    );
    await makePkg(path.join(tmp, 'node_modules', 'dep'), 'dep', '3.0.0');
    await makePkg(
      path.join(tmp, 'node_modules', 'consumer', 'node_modules', 'dep'),
      'dep',
      '2.5.0',
    );
    const violations = await assertConsumerDepsSatisfied(tmp, logger);
    expect(violations).toEqual([]);
  });

  it('ignores deps that are not present (handled elsewhere — phantom or optional)', async () => {
    await makePkg(
      path.join(tmp, 'node_modules', 'consumer'),
      'consumer',
      '1.0.0',
      { 'never-installed': '^1.0.0' },
    );
    const violations = await assertConsumerDepsSatisfied(tmp, logger);
    expect(violations).toEqual([]);
  });
});
