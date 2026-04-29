import { collector } from '../collector';

describe('collector config v4', () => {
  it('rejects tagging in InitConfig', async () => {
    // @ts-expect-error - tagging is removed in v4
    await collector({ tagging: 1 });
  });
});
