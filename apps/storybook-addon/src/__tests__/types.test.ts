import { DataElb, ResolvedProperty, PropertyOrigin } from '../types';

describe('walkerOS types', () => {
  test('DataElb interface should work correctly', () => {
    const dataElb: DataElb = {
      entity: 'button',
      action: 'click',
      data: { category: 'primary' },
    };

    expect(dataElb).toBeDefined();
    expect(dataElb.entity).toBe('button');
    expect(dataElb.action).toBe('click');
    expect(dataElb.data).toEqual({ category: 'primary' });
  });

  test('DataElb should support all optional properties', () => {
    const dataElb: DataElb = {
      entity: 'form',
      trigger: 'submit',
      action: 'send',
      data: { formType: 'contact' },
      context: { page: 'home' },
      globals: { userId: '123' },
      link: { parent: 'section1' },
    };

    expect(dataElb.entity).toBe('form');
    expect(dataElb.trigger).toBe('submit');
    expect(dataElb.action).toBe('send');
    expect(dataElb.data).toEqual({ formType: 'contact' });
    expect(dataElb.context).toEqual({ page: 'home' });
    expect(dataElb.globals).toEqual({ userId: '123' });
    expect(dataElb.link).toEqual({ parent: 'section1' });
  });
});

describe('ResolvedProperty', () => {
  test('carries key, value, and origin', () => {
    const generic: ResolvedProperty = {
      key: 'color',
      value: 'red',
      origin: 'generic',
    };
    const scoped: ResolvedProperty = {
      key: 'currency',
      value: 'EUR',
      origin: 'scoped',
    };
    const explicit: ResolvedProperty = { key: 'id', value: 1, origin: 'data' };
    expect(generic.origin).toBe('generic');
    expect(scoped.origin).toBe('scoped');
    expect(explicit.value).toBe(1);
    const origins: PropertyOrigin[] = ['data', 'generic', 'scoped'];
    expect(origins).toHaveLength(3);
  });
});
