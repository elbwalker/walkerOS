import type { RJSFSchema } from '@rjsf/utils';
import { schemaToProperties, getVisibleProperties } from '../property-table';

describe('schemaToProperties - nested objects', () => {
  const schema: RJSFSchema = {
    type: 'object',
    properties: {
      ga4: {
        type: 'object',
        description: 'GA4-specific configuration settings',
        required: ['measurementId'],
        properties: {
          measurementId: { type: 'string', description: 'GA4 measurement ID' },
          debug: { type: 'boolean', description: 'Enable GA4 debug mode' },
        },
      },
      name: { type: 'string', description: 'Top-level scalar' },
    },
  };

  it('emits the parent object row at depth 0', () => {
    const props = schemaToProperties(schema);
    const ga4 = props.find((p) => p.name === 'ga4');
    expect(ga4).toMatchObject({ name: 'ga4', type: 'object', depth: 0 });
  });

  it('expands nested object properties as depth-1 rows with dotted paths', () => {
    const props = schemaToProperties(schema);

    const measurementId = props.find((p) => p.name === 'ga4.measurementId');
    expect(measurementId).toMatchObject({
      name: 'ga4.measurementId',
      type: 'string',
      depth: 1,
      required: true,
    });

    const debug = props.find((p) => p.name === 'ga4.debug');
    expect(debug).toMatchObject({
      name: 'ga4.debug',
      type: 'boolean',
      depth: 1,
      required: false,
    });
  });

  it('keeps top-level scalar properties at depth 0', () => {
    const props = schemaToProperties(schema);
    const name = props.find((p) => p.name === 'name');
    expect(name).toMatchObject({ name: 'name', type: 'string', depth: 0 });
  });

  it('orders each nested child immediately after its parent', () => {
    const props = schemaToProperties(schema);
    const names = props.map((p) => p.name);
    expect(names).toEqual(['ga4', 'ga4.measurementId', 'ga4.debug', 'name']);
  });

  it('uses the nested object title as its type label when present', () => {
    const titled: RJSFSchema = {
      type: 'object',
      properties: {
        ga4: {
          type: 'object',
          title: 'ga4',
          properties: { measurementId: { type: 'string' } },
        },
      },
    };
    const props = schemaToProperties(titled);
    expect(props.find((p) => p.name === 'ga4')).toMatchObject({ type: 'ga4' });
  });

  it('recurses through multiple nesting levels', () => {
    const deep: RJSFSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: {
              type: 'object',
              properties: {
                c: { type: 'string', description: 'deep leaf' },
              },
            },
          },
        },
      },
    };
    const props = schemaToProperties(deep);
    expect(props.find((p) => p.name === 'a.b.c')).toMatchObject({
      name: 'a.b.c',
      type: 'string',
      depth: 2,
    });
  });
});

describe('getVisibleProperties - collapse', () => {
  const schema: RJSFSchema = {
    type: 'object',
    properties: {
      ga4: {
        type: 'object',
        properties: {
          measurementId: { type: 'string' },
          debug: { type: 'boolean' },
        },
      },
      name: { type: 'string' },
    },
  };

  it('shows every row when nothing is collapsed', () => {
    const props = schemaToProperties(schema);
    const visible = getVisibleProperties(props, new Set());
    expect(visible).toHaveLength(props.length);
  });

  it('hides the children of a collapsed parent', () => {
    const props = schemaToProperties(schema);
    const visible = getVisibleProperties(props, new Set(['ga4']));
    expect(visible.map((p) => p.name)).toEqual(['ga4', 'name']);
  });

  it('hides deeply nested descendants of a collapsed ancestor', () => {
    const deep: RJSFSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: { type: 'object', properties: { c: { type: 'string' } } },
          },
        },
      },
    };
    const props = schemaToProperties(deep);
    const visible = getVisibleProperties(props, new Set(['a']));
    expect(visible.map((p) => p.name)).toEqual(['a']);
  });
});
