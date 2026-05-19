import {
  SourceSchema,
  TransformerSchema,
  DestinationSchema,
  StoreSchema,
} from '../flow';

const cases = [
  { name: 'SourceSchema', schema: SourceSchema },
  { name: 'TransformerSchema', schema: TransformerSchema },
  { name: 'DestinationSchema', schema: DestinationSchema },
  { name: 'StoreSchema', schema: StoreSchema },
];

describe('step schemas — import field', () => {
  it.each(cases)('$name accepts package + import', ({ schema }) => {
    expect(
      schema.safeParse({ package: '@walkeros/x', import: 'fooFactory' })
        .success,
    ).toBe(true);
  });

  it.each(cases)('$name rejects import as non-identifier', ({ schema }) => {
    const result = schema.safeParse({
      package: '@walkeros/x',
      import: '1notAnIdent',
    });
    expect(result.success).toBe(false);
  });

  it.each(cases)('$name rejects code as a string', ({ schema }) => {
    const result = schema.safeParse({
      package: '@walkeros/x',
      code: 'sourceBrowser',
    });
    expect(result.success).toBe(false);
  });

  it.each(cases)('$name accepts code as a Code object', ({ schema }) => {
    expect(schema.safeParse({ code: { push: '$code:() => {}' } }).success).toBe(
      true,
    );
  });
});
