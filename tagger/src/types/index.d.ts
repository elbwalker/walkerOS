import { Walker } from '@elbwalker/walker.js';

export namespace ITagger {
  interface Config {
    prefix: string;
  }

  interface Function {
    config: Config;
    entity: (name: string) => Walker.Properties;
    action: ActionMethod;
    property: PropertyMethod;
    context: ContextMethod;
    globals: (property: string, value: Walker.Property) => Walker.Properties;
  }

  type ActionMethod = {
    (trigger: Trigger, action?: string): Walker.Properties;
    (triggerActions: KevVal): Walker.Properties;
  };

  type ContextMethod = {
    (context: string, value?: Walker.Property): Walker.Properties;
    (context: KevVal): Walker.Properties;
  };

  type PropertyMethod = {
    (entity: string, prop: string, value?: Walker.Property): Walker.Properties;
    (entity: string, properties: KevVal): Walker.Properties;
  };

  interface KevVal {
    [key: string | Trigger]: Walker.Property;
  }

  type Trigger =
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
