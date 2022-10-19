import { IElbwalker, Walker } from '@elbwalker/walker.js';

export namespace ITagger {
  type AnyObject = Record<string, unknown>;

  export interface Config {
    prefix: string;
  }

  export interface Function {
    config: Config;
    entity: (name: string) => AnyObject;
    action: (trigger: ITagger.Trigger, action?: string) => AnyObject;
    property: (
      entity: string,
      prop: string,
      value: Walker.Property,
    ) => AnyObject;
  }

  export type Trigger =
    | 'click'
    | 'hover'
    | 'load'
    | 'pulse'
    | 'submit'
    | 'visible'
    | 'wait';
}

function Tagger(config: Partial<ITagger.Config> = {}): ITagger.Function {
  const instance: ITagger.Function = {
    config: {
      prefix: config.prefix || IElbwalker.Commands.Prefix,
    },
    entity,
    action,
    property,
  };

  function entity(name: string) {
    return { [attrName()]: name };
  }

  // property("entity", "property", "value") -> data-elb-entity="property:value"
  function property(entity: string, property: string, value: Walker.Property) {
    return { [attrName(entity)]: property + ':' + value };
  }

  // property("entity", "property", "value") -> data-elb-entity="property:value"
  function action(trigger: ITagger.Trigger, action?: string) {
    action = action || trigger;
    return { [attrName('action', false)]: trigger + ':' + action };
  }

  function attrName(name?: string, isProperty = true) {
    const separator = isProperty ? '-' : '';
    name = name ? separator + name : '';

    return instance.config.prefix + name;
  }

  return instance;
}

export default Tagger;
