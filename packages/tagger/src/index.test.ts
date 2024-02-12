import Tagger from '.';
import { ITagger } from './types';

describe('Tagger', () => {
  let tagger: ITagger.Instance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    tagger = Tagger();
  });

  afterEach(() => {});

  test('Init', () => {
    expect(tagger.config).toMatchObject({
      prefix: 'data-elb',
    });

    tagger = Tagger({ prefix: 'elb' });
    expect(tagger.config).toMatchObject({
      prefix: 'elb',
    });
  });

  test('Entity', () => {
    expect(tagger.entity('promotion')).toMatchObject({
      'data-elb': 'promotion',
    });
  });

  test('Action', () => {
    expect(tagger.action('visible', 'view')).toMatchObject({
      'data-elbaction': 'visible:view',
    });

    expect(
      tagger.action({
        visible: 'impression',
        load: 'view',
        'load(entity)': 'filter',
      }),
    ).toMatchObject({
      'data-elbaction': 'visible:impression;load:view;load(entity):filter',
    });
  });

  test('Property', () => {
    expect(tagger.property('promotion', 'category', 'analytics')).toMatchObject(
      {
        'data-elb-promotion': 'category:analytics',
      },
    );

    expect(
      tagger.property('product', {
        id: 'abc',
        price: 42,
      }),
    ).toMatchObject({
      'data-elb-product': 'id:abc;price:42',
    });
  });

  test('Context', () => {
    expect(tagger.context('test', 'engagement')).toMatchObject({
      'data-elbcontext': 'test:engagement',
    });

    expect(
      tagger.context({
        test: 'a',
        shopping: 'discovery',
      }),
    ).toMatchObject({
      'data-elbcontext': 'test:a;shopping:discovery',
    });
  });

  test('Globals', () => {
    expect(tagger.globals('language', 'en')).toMatchObject({
      'data-elbglobals': 'language:en',
    });

    expect(
      tagger.globals({
        language: 'de',
        pagegroup: 'shop',
      }),
    ).toMatchObject({
      'data-elbglobals': 'language:de;pagegroup:shop',
    });
  });
});
