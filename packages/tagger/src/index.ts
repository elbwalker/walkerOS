import type { Walker } from '@elbwalker/types';
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

  // data-elb="entity"
  function entity(name: string) {
    return { [attrName()]: name };
  }

  // data-elbaction="trigger:action"
  function actionMethod(
    triggerActions: ITagger.Trigger | ITagger.KevVal,
    action?: string,
  ): Walker.Properties {
    if (typeof triggerActions === 'string')
      triggerActions = { [triggerActions]: action || triggerActions };

    return {
      [attrName('action', false)]: getStr(triggerActions),
    };
  }

  // data-elb-entity="key:val"
  function propertyMethod(
    entity: string,
    properties: string | ITagger.KevVal,
    value?: Walker.Property,
  ): Walker.Properties {
    if (typeof properties === 'string')
      properties = { [properties]: value || '' };

    return { [attrName(entity)]: getStr(properties) };
  }

  // data-elbcontext="key:val"
  function contextMethod(
    context: string | ITagger.KevVal,
    value?: Walker.Property,
  ): Walker.Properties {
    if (typeof context === 'string') context = { [context]: value || '' };

    return { [attrName('context', false)]: getStr(context) };
  }

  // data-elbglobals="key:val"
  function globalsMethod(
    globals: string | ITagger.KevVal,
    value?: Walker.Property,
  ): Walker.Properties {
    if (typeof globals === 'string') globals = { [globals]: value || '' };

    return { [attrName('globals', false)]: getStr(globals) };
  }

  function attrName(name?: string, isProperty = true) {
    const separator = isProperty ? '-' : '';
    name = name ? separator + name : '';

    return instance.config.prefix + name;
  }

  function getStr(obj: ITagger.KevVal): string {
    let str = '';
    let separator = '';

    Object.entries(obj).forEach(([key, val]) => {
      str += `${separator}${key}:${val}`;
      separator = ';';
    });

    return str;
  }

  return instance;
}

export default Tagger;
