import { Walker } from '@elbwalker/walker.js';
import type { ITagger } from './types';

function Tagger(config: Partial<ITagger.Config> = {}): ITagger.Function {
  const instance: ITagger.Function = {
    config: {
      prefix: config.prefix || 'data-elb',
    },
    entity,
    action: actionMethod,
    property: propertyMethod,
    context,
    globals,
  };

  // entity("promotion") -> data-elb="promotion"
  function entity(name: string) {
    return { [attrName()]: name };
  }

  // data-elbaction="visible:view"
  function actionMethod(
    triggerActions: ITagger.Trigger | ITagger.KevVal,
    action?: string,
  ): Walker.Properties {
    if (typeof triggerActions === 'string') {
      return actionMethod({ [triggerActions]: action || triggerActions });
    }

    let str = '';
    let separator = '';

    Object.entries(triggerActions).forEach(([key, val]) => {
      str += `${separator}${key}:${val}`;
      separator = ';';
    });

    return {
      [attrName('action', false)]: str,
    };
  }

  // data-elb-promotion="category:analytics"
  function propertyMethod(
    entity: string,
    properties: string | ITagger.KevVal,
    value?: Walker.Property,
  ): Walker.Properties {
    if (typeof properties === 'string') {
      return propertyMethod(entity, { [properties]: value || '' });
    }

    let str = '';
    let separator = '';

    Object.entries(properties).forEach(([key, val]) => {
      str += `${separator}${key}:${val}`;
      separator = ';';
    });

    return { [attrName(entity)]: str };
  }

  // context("test", "engagement") -> data-elbcontext="test:engagement"
  function context(property: string, value: Walker.Property) {
    return {
      [attrName('context', false)]: property + ':' + value,
    };
  }

  // globals("language", "en") -> data-elbglobals="language:en"
  function globals(property: string, value: Walker.Property) {
    return {
      [attrName('globals', false)]: property + ':' + value,
    };
  }

  function attrName(name?: string, isProperty = true) {
    const separator = isProperty ? '-' : '';
    name = name ? separator + name : '';

    return instance.config.prefix + name;
  }

  return instance;
}

export default Tagger;
