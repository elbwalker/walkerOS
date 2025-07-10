import { tagger, Tagger } from '../tagger';

describe('Tagger', () => {
  let instance: Tagger.Instance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    instance = tagger();
  });

  afterEach(() => {});

  test('Init', () => {
    expect(instance.config).toMatchObject({
      prefix: 'data-elb',
    });

    instance = tagger({ prefix: 'elb' });
    expect(instance.config).toMatchObject({
      prefix: 'elb',
    });
  });

  test('Entity', () => {
    expect(instance.entity('promotion')).toMatchObject({
      'data-elb': 'promotion',
    });
  });

  test('Action', () => {
    expect(instance.action('visible', 'view')).toMatchObject({
      'data-elbaction': 'visible:view',
    });

    expect(
      instance.action({
        visible: 'impression',
        load: 'view',
        'load(entity)': 'filter',
      }),
    ).toMatchObject({
      'data-elbaction': 'visible:impression;load:view;load(entity):filter',
    });
  });

  test('Property', () => {
    expect(
      instance.property('promotion', 'category', 'analytics'),
    ).toMatchObject({
      'data-elb-promotion': 'category:analytics',
    });

    expect(
      instance.property('product', {
        id: 'abc',
        price: 42,
      }),
    ).toMatchObject({
      'data-elb-product': 'id:abc;price:42',
    });
  });

  test('Context', () => {
    expect(instance.context('test', 'engagement')).toMatchObject({
      'data-elbcontext': 'test:engagement',
    });

    expect(
      instance.context({
        test: 'a',
        shopping: 'discovery',
      }),
    ).toMatchObject({
      'data-elbcontext': 'test:a;shopping:discovery',
    });
  });

  test('Globals', () => {
    expect(instance.globals('language', 'en')).toMatchObject({
      'data-elbglobals': 'language:en',
    });

    expect(
      instance.globals({
        language: 'de',
        pagegroup: 'shop',
      }),
    ).toMatchObject({
      'data-elbglobals': 'language:de;pagegroup:shop',
    });
  });
});
