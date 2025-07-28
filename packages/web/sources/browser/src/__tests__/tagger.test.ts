import { createTagger } from '../tagger';
import type { WalkerOS, Collector } from '@walkeros/core';

describe('Tagger', () => {
  describe('Factory Function', () => {
    test('creates tagger with default prefix', () => {
      const result = createTagger()().globals('lang', 'en').get();
      expect(result).toMatchObject({
        'data-elbglobals': 'lang:en',
      });
    });

    test('creates tagger with custom prefix', () => {
      const result = createTagger({ prefix: 'custom-prefix' })('product')
        .data('id', '123')
        .get();
      expect(result).toMatchObject({
        'custom-prefix': 'product',
        'custom-prefix-product': 'id:123',
      });
    });
  });

  describe('Tagger Function', () => {
    test('sets entity when provided', () => {
      const result = createTagger()('product').get();
      expect(result).toMatchObject({
        'data-elb': 'product',
      });
    });

    test('works without entity parameter', () => {
      const result = createTagger()().data('category', 'electronics').get();
      expect(result).toMatchObject({
        'data-elb-': 'category:electronics',
      });
    });
  });

  describe('Entity Method', () => {
    test('sets entity scope', () => {
      const result = createTagger()().entity('product').get();
      expect(result).toMatchObject({
        'data-elb': 'product',
      });
    });

    test('changes entity scope', () => {
      const result = createTagger()('product').entity('user').get();
      expect(result).toMatchObject({
        'data-elb': 'user',
      });
    });
  });

  describe('Data Method', () => {
    test('single key-value with entity', () => {
      const result = createTagger()('product').data('id', 123).get();
      expect(result).toMatchObject({
        'data-elb': 'product',
        'data-elb-product': 'id:123',
      });
    });

    test('single key-value without entity (generic)', () => {
      const result = createTagger()().data('category', 'electronics').get();
      expect(result).toMatchObject({
        'data-elb-': 'category:electronics',
      });
    });

    test('object with multiple properties', () => {
      const result = createTagger()('product')
        .data({ id: 123, name: 'Widget', price: 99.99 })
        .get();
      expect(result).toMatchObject({
        'data-elb': 'product',
        'data-elb-product': 'id:123;name:Widget;price:99.99',
      });
    });

    test('accumulates multiple data calls', () => {
      const result = createTagger()('product')
        .data('id', 123)
        .data('name', 'Widget')
        .data({ price: 99.99, category: 'electronics' })
        .get();
      expect(result).toMatchObject({
        'data-elb': 'product',
        'data-elb-product':
          'id:123;name:Widget;price:99.99;category:electronics',
      });
    });

    test('handles different entity scopes', () => {
      const result = createTagger()('product')
        .data('id', 123)
        .entity('user')
        .data('name', 'John')
        .get();
      expect(result).toMatchObject({
        'data-elb': 'user',
        'data-elb-product': 'id:123',
        'data-elb-user': 'name:John',
      });
    });
  });

  describe('Action Method', () => {
    test('single trigger and action', () => {
      const result = createTagger()().action('load', 'view').get();
      expect(result).toMatchObject({
        'data-elbaction': 'load:view',
      });
    });

    test('single combined trigger:action', () => {
      const result = createTagger()().action('load:view').get();
      expect(result).toMatchObject({
        'data-elbaction': 'load:view',
      });
    });

    test('object with multiple actions', () => {
      const result = createTagger()()
        .action({ load: 'view', click: 'select', visible: 'impression' })
        .get();
      expect(result).toMatchObject({
        'data-elbaction': 'load:view;click:select;visible:impression',
      });
    });

    test('accumulates multiple action calls', () => {
      const result = createTagger()()
        .action('load', 'view')
        .action('click', 'select')
        .action({ visible: 'impression' })
        .get();
      expect(result).toMatchObject({
        'data-elbaction': 'load:view;click:select;visible:impression',
      });
    });

    test('works with entity', () => {
      const result = createTagger()('product')
        .action('load', 'view')
        .data('id', 123)
        .get();
      expect(result).toMatchObject({
        'data-elb': 'product',
        'data-elbaction': 'load:view',
        'data-elb-product': 'id:123',
      });
    });
  });

  describe('Context Method', () => {
    test('single key-value', () => {
      const result = createTagger()().context('test', 'engagement').get();
      expect(result).toMatchObject({
        'data-elbcontext': 'test:engagement',
      });
    });

    test('object with multiple contexts', () => {
      const result = createTagger()()
        .context({ test: 'engagement', position: 'header', type: 'promo' })
        .get();
      expect(result).toMatchObject({
        'data-elbcontext': 'test:engagement;position:header;type:promo',
      });
    });

    test('accumulates multiple context calls', () => {
      const result = createTagger()()
        .context('test', 'engagement')
        .context({ position: 'header' })
        .context('type', 'promo')
        .get();
      expect(result).toMatchObject({
        'data-elbcontext': 'test:engagement;position:header;type:promo',
      });
    });
  });

  describe('Globals Method', () => {
    test('single key-value', () => {
      const result = createTagger()().globals('lang', 'en').get();
      expect(result).toMatchObject({
        'data-elbglobals': 'lang:en',
      });
    });

    test('object with multiple globals', () => {
      const result = createTagger()()
        .globals({ lang: 'en', plan: 'paid', version: '1.0' })
        .get();
      expect(result).toMatchObject({
        'data-elbglobals': 'lang:en;plan:paid;version:1.0',
      });
    });

    test('accumulates multiple globals calls', () => {
      const result = createTagger()()
        .globals('lang', 'en')
        .globals({ plan: 'paid' })
        .globals('version', '1.0')
        .get();
      expect(result).toMatchObject({
        'data-elbglobals': 'lang:en;plan:paid;version:1.0',
      });
    });
  });

  describe('Link Method', () => {
    test('single id and type', () => {
      const result = createTagger()().link('details', 'parent').get();
      expect(result).toMatchObject({
        'data-elblink': 'details:parent',
      });
    });

    test('object with multiple links', () => {
      const result = createTagger()()
        .link({ details: 'parent', modal: 'child', sidebar: 'child' })
        .get();
      expect(result).toMatchObject({
        'data-elblink': 'details:parent;modal:child;sidebar:child',
      });
    });

    test('accumulates multiple link calls', () => {
      const result = createTagger()()
        .link('details', 'parent')
        .link({ modal: 'child' })
        .link('sidebar', 'child')
        .get();
      expect(result).toMatchObject({
        'data-elblink': 'details:parent;modal:child;sidebar:child',
      });
    });
  });

  describe('Value Escaping', () => {
    test('escapes semicolons in values', () => {
      const result = createTagger()()
        .data('key', 'value;with;semicolons')
        .get();
      expect(result).toMatchObject({
        'data-elb-': 'key:value\\;with\\;semicolons',
      });
    });

    test('escapes colons in values', () => {
      const result = createTagger()().data('key', 'value:with:colons').get();
      expect(result).toMatchObject({
        'data-elb-': 'key:value\\:with\\:colons',
      });
    });

    test('escapes quotes in values', () => {
      const result = createTagger()().data('key', "value'with'quotes").get();
      expect(result).toMatchObject({
        'data-elb-': "key:value\\'with\\'quotes",
      });
    });

    test('escapes backslashes in values', () => {
      const result = createTagger()()
        .data('key', 'value\\with\\backslashes')
        .get();
      expect(result).toMatchObject({
        'data-elb-': 'key:value\\\\with\\\\backslashes',
      });
    });

    test('escapes complex values', () => {
      const result = createTagger()().context('test', "a;b:c'd\\e").get();
      expect(result).toMatchObject({
        'data-elbcontext': "test:a\\;b\\:c\\'d\\\\e",
      });
    });
  });

  describe('Complex Chaining', () => {
    test('full chain with entity', () => {
      const result = createTagger()('product')
        .data('id', 123)
        .data({ name: 'Widget', price: 99.99 })
        .action('load', 'view')
        .action({ click: 'select' })
        .context('test', 'engagement')
        .globals('lang', 'en')
        .link('details', 'parent')
        .get();

      expect(result).toMatchObject({
        'data-elb': 'product',
        'data-elb-product': 'id:123;name:Widget;price:99.99',
        'data-elbaction': 'load:view;click:select',
        'data-elbcontext': 'test:engagement',
        'data-elbglobals': 'lang:en',
        'data-elblink': 'details:parent',
      });
    });

    test('full chain without entity (generic)', () => {
      const result = createTagger()()
        .data({ category: 'electronics', brand: 'TechCorp' })
        .action({ load: 'view', visible: 'impression' })
        .context({ test: 'a/b', position: 'header' })
        .globals({ lang: 'en', plan: 'paid' })
        .get();

      expect(result).toMatchObject({
        'data-elb-': 'category:electronics;brand:TechCorp',
        'data-elbaction': 'load:view;visible:impression',
        'data-elbcontext': 'test:a/b;position:header',
        'data-elbglobals': 'lang:en;plan:paid',
      });
    });

    test('entity change mid-chain', () => {
      const result = createTagger()('product')
        .data('id', 123)
        .entity('user')
        .data('name', 'John')
        .action('load', 'view')
        .get();

      expect(result).toMatchObject({
        'data-elb': 'user',
        'data-elb-product': 'id:123',
        'data-elb-user': 'name:John',
        'data-elbaction': 'load:view',
      });
    });
  });

  describe('Type Handling', () => {
    test('handles different value types', () => {
      const result = createTagger()('test')
        .data({
          string: 'text',
          number: 42,
          float: 3.14,
          boolean: true,
          undefined: undefined,
        })
        .get();

      expect(result).toMatchObject({
        'data-elb': 'test',
        'data-elb-test':
          'string:text;number:42;float:3.14;boolean:true;undefined:undefined',
      });
    });

    test('handles empty values', () => {
      const result = createTagger()()
        .data('empty', '')
        .data('zero', 0)
        .data('false', false)
        .get();

      expect(result).toMatchObject({
        'data-elb-': 'empty:;zero:0;false:false',
      });
    });

    test('handles null values when passed directly', () => {
      const result = createTagger()()
        .data('nullValue', null as unknown as WalkerOS.Property)
        .get();

      expect(result).toMatchObject({
        'data-elb-': 'nullValue:undefined',
      });
    });
  });
});
