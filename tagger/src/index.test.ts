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
    expect(tagger.entity('e')).toMatchObject({
      'data-elb': 'e',
    });
  });

  test('Action', () => {
    expect(tagger.action('click', 'a')).toMatchObject({
      'data-elbaction': 'click:a',
    });
  });

  test('Property', () => {
    expect(tagger.property('e', 'p', 'v')).toMatchObject({
      'data-elb-e': 'p:v',
    });
  });
});
