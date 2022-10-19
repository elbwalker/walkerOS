import { IElbwalker, Walker } from '@elbwalker/walker.js';

export namespace ITagger {
  export interface Config {
    prefix: string;
  }

  export interface Function {
    config: Config;
    entity: (name: string) => Walker.Properties;
    action: (trigger: ITagger.Trigger, action?: string) => Walker.Properties;
    property: (
      entity: string,
      prop: string,
      value: Walker.Property,
    ) => Walker.Properties;
    context: (property: string, value: Walker.Property) => Walker.Properties;
    globals: (property: string, value: Walker.Property) => Walker.Properties;
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
    context,
    globals,
  };

  // entity("promotion") -> data-elb="promotion"
  function entity(name: string) {
    return { [attrName()]: name };
  }

  // action("visible", "view") -> data-elbaction="visible:view"
  function action(trigger: ITagger.Trigger, action?: string) {
    action = action || trigger;
    return {
      [attrName(IElbwalker.Commands.Action, false)]: trigger + ':' + action,
    };
  }

  // property("promotion", "category", "analytics") -> data-elb-promotion="category:analytics"
  function property(entity: string, property: string, value: Walker.Property) {
    return { [attrName(entity)]: property + ':' + value };
  }

  // context("test", "engagement") -> data-elbcontext="test:engagement"
  function context(property: string, value: Walker.Property) {
    return {
      [attrName(IElbwalker.Commands.Context, false)]: property + ':' + value,
    };
  }

  // globals("language", "en") -> data-elbglobals="language:en"
  function globals(property: string, value: Walker.Property) {
    return {
      [attrName(IElbwalker.Commands.Globals, false)]: property + ':' + value,
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
