import { connectorDatalayer } from '..';
// import type { ConnectorDatalayer } from '..';

describe('connector datalayer', () => {
  beforeEach(() => {});

  test('init', () => {
    expect(connectorDatalayer()).toBe('dataLayer');
  });
});
