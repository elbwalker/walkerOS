import {
  ClickHouseError,
  __failInsert,
  __getCalls,
  __reset,
  createClient,
} from '../__mocks__/@clickhouse/client';

const url = 'https://clickhouse.example.com:8443';
const values = [{ name: 'page view' }];

describe('client mock', () => {
  beforeEach(() => {
    __reset();
  });

  it('records the factory call and every client call in order', async () => {
    const client = createClient({ url, database: 'analytics' });
    await client.insert({ table: 'events', values, format: 'JSONEachRow' });
    await client.close();

    expect(__getCalls()).toEqual([
      ['createClient', { url, database: 'analytics' }],
      ['insert', { table: 'events', values, format: 'JSONEachRow' }],
      ['close'],
    ]);
  });

  it('rejects the given number of inserts with a coded ClickHouseError', async () => {
    const client = createClient({ url });
    __failInsert(2, { code: '159', message: 'timeout exceeded' });

    const insert = () => client.insert({ table: 'events', values });

    await expect(insert()).rejects.toBeInstanceOf(ClickHouseError);
    await expect(insert()).rejects.toMatchObject({ code: '159' });
    await expect(insert()).resolves.toMatchObject({ executed: true });
  });

  it('rejects with a codeless Error when no code is given', async () => {
    const client = createClient({ url });
    __failInsert(1);

    const error: unknown = await client
      .insert({ table: 'events', values })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ClickHouseError);
    expect(error).not.toHaveProperty('code');
  });
});
