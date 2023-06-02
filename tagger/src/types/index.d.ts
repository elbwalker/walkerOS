import { Walker } from '@elbwalker/walker.js';

export namespace ITagger {
  interface Config {
    prefix: string;
  }

  interface Function {
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

  type Trigger =
    | 'click'
    | 'hover'
    | 'load'
    | 'pulse'
    | 'submit'
    | 'visible'
    | 'wait';
}
