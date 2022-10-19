import Tagger, { ITagger } from '.';

describe('Tagger', () => {
  const w = window;
  let tagger: ITagger.Function;

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
  });

  test('Property', () => {
    expect(tagger.property('promotion', 'category', 'analytics')).toMatchObject(
      {
        'data-elb-promotion': 'category:analytics',
      },
    );
  });

  test('Context', () => {
    expect(tagger.context('test', 'engagement')).toMatchObject({
      'data-elbcontext': 'test:engagement',
    });
  });

  test('Globals', () => {
    expect(tagger.globals('language', 'en')).toMatchObject({
      'data-elbglobals': 'language:en',
    });
  });
});
