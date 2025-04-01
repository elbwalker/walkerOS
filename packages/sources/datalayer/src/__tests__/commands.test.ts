import type { DataLayer } from '../types';
import { sourceDataLayer } from '..';

describe('commands', () => {
  const elb = jest.fn(); //.mockImplementation(console.log);
  let dataLayer: DataLayer;

  const gtag: Gtag.Gtag = function () {
    dataLayer.push(arguments);
  };

  beforeEach(() => {
    window.dataLayer = [];
    dataLayer = window.dataLayer as DataLayer;
  });

  test('set', async () => {
    sourceDataLayer({
      elb,
      mapping: {
        'set campaign': {
          name: 'walker globals',
          custom: {
            command: {
              map: {
                term: 'term',
              },
            },
          },
        },
      },
    });

    gtag('set', 'campaign', {
      term: 'running+shoes',
    });
    await jest.runAllTimersAsync();
    expect(elb).toHaveBeenCalledWith('walker globals', {
      term: 'running+shoes',
    });
  });
});
