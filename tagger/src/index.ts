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
    context: contextMethod,
    globals: globalsMethod,
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

  // data-elbcontext="test:a:shopping:discovery"
  function contextMethod(
    context: string | ITagger.KevVal,
    value?: Walker.Property,
  ): Walker.Properties {
    if (typeof context === 'string') {
      return contextMethod({ [context]: value || '' });
    }

    let str = '';
    let separator = '';

    Object.entries(context).forEach(([key, val]) => {
      str += `${separator}${key}:${val}`;
      separator = ';';
    });

    return { [attrName('context', false)]: str };
  }

  // globals("language", "en") -> data-elbglobals="language:en"
  function globalsMethod(
    global: string | ITagger.KevVal,
    value?: Walker.Property,
  ): Walker.Properties {
    if (typeof global === 'string') {
      return globalsMethod({ [global]: value || '' });
    }

    let str = '';
    let separator = '';

    Object.entries(global).forEach(([key, val]) => {
      str += `${separator}${key}:${val}`;
      separator = ';';
    });

    return { [attrName('globals', false)]: str };
  }

  function attrName(name?: string, isProperty = true) {
    const separator = isProperty ? '-' : '';
    name = name ? separator + name : '';

    return instance.config.prefix + name;
  }

  return instance;
}

export default Tagger;
