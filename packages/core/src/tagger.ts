import type { WalkerOS } from './types';

export namespace Tagger {
  export interface Config {
    prefix: string;
  }

  export interface Instance {
    config: Config;
    entity: (name: string) => WalkerOS.Properties;
    action: ActionMethod;
    property: PropertyMethod;
    context: ContextMethod;
    globals: GlobalsMethod;
  }

  type ActionMethod = {
    (trigger: Trigger, action?: string): WalkerOS.Properties;
    (triggerActions: KevVal): WalkerOS.Properties;
  };

  type ContextMethod = {
    (context: string, value?: WalkerOS.Property): WalkerOS.Properties;
    (context: KevVal): WalkerOS.Properties;
  };

  type GlobalsMethod = {
    (global: string, value?: WalkerOS.Property): WalkerOS.Properties;
    (global: KevVal): WalkerOS.Properties;
  };

  type PropertyMethod = {
    (
      entity: string,
      prop: string,
      value?: WalkerOS.Property,
    ): WalkerOS.Properties;
    (entity: string, properties: KevVal): WalkerOS.Properties;
  };

  export interface KevVal {
    [key: string | Trigger]: WalkerOS.Property;
  }

  export type Trigger =
    | 'click'
    | 'custom'
    | 'hover'
    | 'load'
    | 'pulse'
    | 'submit'
    | 'visible'
    | 'wait'
    | string;
}

export function tagger(config: Partial<Tagger.Config> = {}): Tagger.Instance {
  const instance: Tagger.Instance = {
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
    triggerActions: Tagger.Trigger | Tagger.KevVal,
    action?: string,
  ): WalkerOS.Properties {
    if (typeof triggerActions === 'string')
      triggerActions = { [triggerActions]: action || triggerActions };

    return {
      [attrName('action', false)]: getStr(triggerActions),
    };
  }

  // data-elb-entity="key:val"
  function propertyMethod(
    entity: string,
    properties: string | Tagger.KevVal,
    value?: WalkerOS.Property,
  ): WalkerOS.Properties {
    if (typeof properties === 'string')
      properties = { [properties]: value || '' };

    return { [attrName(entity)]: getStr(properties) };
  }

  // data-elbcontext="key:val"
  function contextMethod(
    context: string | Tagger.KevVal,
    value?: WalkerOS.Property,
  ): WalkerOS.Properties {
    if (typeof context === 'string') context = { [context]: value || '' };

    return { [attrName('context', false)]: getStr(context) };
  }

  // data-elbglobals="key:val"
  function globalsMethod(
    globals: string | Tagger.KevVal,
    value?: WalkerOS.Property,
  ): WalkerOS.Properties {
    if (typeof globals === 'string') globals = { [globals]: value || '' };

    return { [attrName('globals', false)]: getStr(globals) };
  }

  function attrName(name?: string, isProperty = true) {
    const separator = isProperty ? '-' : '';
    name = name ? separator + name : '';

    return instance.config.prefix + name;
  }

  function getStr(obj: Tagger.KevVal): string {
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
