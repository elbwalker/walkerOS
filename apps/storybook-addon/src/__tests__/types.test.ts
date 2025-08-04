import { DataElb } from '../types';

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
