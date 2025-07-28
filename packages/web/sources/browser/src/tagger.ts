import type { WalkerOS } from '@walkeros/core';
import { isString, isDefined } from '@walkeros/core';

export interface TaggerConfig {
  prefix?: string;
}

export interface TaggerInstance {
  entity: (name: string) => TaggerInstance;
  data: ((key: string, value: WalkerOS.Property) => TaggerInstance) &
    ((data: WalkerOS.Properties) => TaggerInstance);
  action: ((trigger: string, action?: string) => TaggerInstance) &
    ((actions: Record<string, string>) => TaggerInstance);
  context: ((key: string, value: WalkerOS.Property) => TaggerInstance) &
    ((context: WalkerOS.Properties) => TaggerInstance);
  globals: ((key: string, value: WalkerOS.Property) => TaggerInstance) &
    ((globals: WalkerOS.Properties) => TaggerInstance);
  link: ((id: string, type: string) => TaggerInstance) &
    ((links: Record<string, string>) => TaggerInstance);
  get: () => Record<string, string>;
}

/**
 * Creates a new tagger instance for generating walkerOS data attributes.
 *
 * @param config The configuration for the tagger.
 * @returns A new tagger instance.
 */
export function createTagger(
  config: TaggerConfig = {},
): (entity?: string) => TaggerInstance {
  const prefix = config.prefix || 'data-elb';

  return function (entity?: string): TaggerInstance {
    // Internal state
    let currentEntity: string | undefined = entity;
    const dataProperties: Record<string, WalkerOS.Properties> = {};
    const actionProperties: Record<string, string> = {};
    const contextProperties: WalkerOS.Properties = {};
    const globalProperties: WalkerOS.Properties = {};
    const linkProperties: Record<string, string> = {};

    // Helper function to escape special characters
    function escapeValue(value: WalkerOS.Property | undefined): string {
      if (!isDefined(value) || value === null) return 'undefined';

      let str = String(value);

      // Escape backslashes first, then other characters
      str = str.replace(/\\/g, '\\\\');
      str = str.replace(/;/g, '\\;');
      str = str.replace(/:/g, '\\:');
      str = str.replace(/'/g, "\\'");

      return str;
    }

    // Helper function to serialize key-value pairs
    function serializeKeyValue(obj: WalkerOS.Properties): string {
      return Object.entries(obj)
        .map(([key, value]) => `${key}:${escapeValue(value)}`)
        .join(';');
    }

    const instance: TaggerInstance = {
      entity(name: string): TaggerInstance {
        currentEntity = name;
        return instance;
      },

      data(
        keyOrData: string | WalkerOS.Properties,
        value?: WalkerOS.Property,
      ): TaggerInstance {
        const entityKey = currentEntity ?? '';

        if (!dataProperties[entityKey]) {
          dataProperties[entityKey] = {};
        }

        if (isString(keyOrData)) {
          dataProperties[entityKey][keyOrData] = value;
        } else {
          Object.assign(dataProperties[entityKey], keyOrData);
        }

        return instance;
      },

      action(
        triggerOrActions: string | Record<string, string>,
        actionValue?: string,
      ): TaggerInstance {
        if (isString(triggerOrActions)) {
          if (isDefined(actionValue)) {
            // Two parameters: trigger and action
            actionProperties[triggerOrActions] = actionValue;
          } else {
            // Single parameter: could be "trigger:action" or just "trigger"
            if (triggerOrActions.includes(':')) {
              const [trigger, action] = triggerOrActions.split(':', 2);
              actionProperties[trigger] = action;
            } else {
              actionProperties[triggerOrActions] = triggerOrActions;
            }
          }
        } else {
          Object.assign(actionProperties, triggerOrActions);
        }

        return instance;
      },

      context(
        keyOrContext: string | WalkerOS.Properties,
        value?: WalkerOS.Property,
      ): TaggerInstance {
        if (isString(keyOrContext)) {
          contextProperties[keyOrContext] = value;
        } else {
          Object.assign(contextProperties, keyOrContext);
        }

        return instance;
      },

      globals(
        keyOrGlobals: string | WalkerOS.Properties,
        value?: WalkerOS.Property,
      ): TaggerInstance {
        if (isString(keyOrGlobals)) {
          globalProperties[keyOrGlobals] = value;
        } else {
          Object.assign(globalProperties, keyOrGlobals);
        }

        return instance;
      },

      link(
        idOrLinks: string | Record<string, string>,
        type?: string,
      ): TaggerInstance {
        if (isString(idOrLinks)) {
          linkProperties[idOrLinks] = type!;
        } else {
          Object.assign(linkProperties, idOrLinks);
        }

        return instance;
      },

      get(): Record<string, string> {
        const attributes: Record<string, string> = {};

        // Add entity attribute if set
        if (currentEntity) {
          attributes[prefix] = currentEntity;
        }

        // Add data attributes
        Object.entries(dataProperties).forEach(([entityKey, props]) => {
          if (Object.keys(props).length > 0) {
            const attrName = entityKey
              ? `${prefix}-${entityKey}`
              : `${prefix}-`;
            attributes[attrName] = serializeKeyValue(props);
          }
        });

        // Add action attributes
        if (Object.keys(actionProperties).length > 0) {
          attributes[`${prefix}action`] = serializeKeyValue(actionProperties);
        }

        // Add context attributes
        if (Object.keys(contextProperties).length > 0) {
          attributes[`${prefix}context`] = serializeKeyValue(contextProperties);
        }

        // Add global attributes
        if (Object.keys(globalProperties).length > 0) {
          attributes[`${prefix}globals`] = serializeKeyValue(globalProperties);
        }

        // Add link attributes
        if (Object.keys(linkProperties).length > 0) {
          attributes[`${prefix}link`] = serializeKeyValue(linkProperties);
        }

        return attributes;
      },
    };

    return instance;
  };
}
