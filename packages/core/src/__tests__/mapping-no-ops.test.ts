import type { MappingPosition } from '../mapping-no-ops';
import { getMappingNoOpMessage, getMappingNoOpPaths } from '../mapping-no-ops';

describe('getMappingNoOpPaths', () => {
  const mapping = {
    data: { map: {} },
    include: ['data'],
    consent: { marketing: true },
    policy: {},
    mapping: {
      page: {
        view: { data: 'data', extend: {}, name: 'pv', ignore: false },
        click: [{ silent: true }, { batch: 10, condition: () => true }],
      },
    },
  };

  it.each<[MappingPosition, string[]]>([
    [
      'transformer',
      [
        'config.consent',
        'config.include',
        'config.data',
        'config.mapping.page.view.extend',
        'config.mapping.page.view.data',
        'config.mapping.page.click[0].silent',
        'config.mapping.page.click[1].batch',
      ],
    ],
    [
      'source',
      [
        'config.data',
        'config.include',
        'config.mapping.page.view.data',
        'config.mapping.page.view.extend',
        'config.mapping.page.click[0].silent',
        'config.mapping.page.click[1].batch',
      ],
    ],
    ['destination', ['config.mapping.page.view.extend']],
  ])('lists what does nothing at the %s position', (position, paths) => {
    expect(getMappingNoOpPaths(position, mapping, 'config')).toEqual(paths);
  });

  it('names the paths and what applies at the position', () => {
    expect(
      getMappingNoOpMessage('source', ['config.mapping.page.view.data']),
    ).toBe(
      "`config.mapping.page.view.data` does nothing at the source position; only `consent`, `policy` and a rule's `condition`, `policy`, `name` and `ignore` apply; edit the event at a source with `policy`.",
    );
  });
});
