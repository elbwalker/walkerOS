import { Walker } from '@elbwalker/walker.js';
import type { ITagger } from './types';

function Tagger(config: Partial<ITagger.Config> = {}): ITagger.Function {
  const instance: ITagger.Function = {
    config: {
      prefix: config.prefix || 'data-elb',
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
      [attrName('action', false)]: trigger + ':' + action,
    };
  }

  // property("promotion", "category", "analytics") -> data-elb-promotion="category:analytics"
  function property(entity: string, property: string, value: Walker.Property) {
    return { [attrName(entity)]: property + ':' + value };
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
