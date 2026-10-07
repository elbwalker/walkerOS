import type { WalkerOS } from '@walkeros/core';
import { isString, isDefined } from '@walkeros/core';

export interface TaggerConfig {
  prefix?: string;
}

export interface TaggerInstance {
  entity: (name: string) => TaggerInstance;
  data: ((key: string, value: WalkerOS.Property) => TaggerInstance) &
    ((data: WalkerOS.Properties) => TaggerInstance);
  scoped: ((key: string, value: WalkerOS.Property) => TaggerInstance) &
    ((scoped: WalkerOS.Properties) => TaggerInstance);
  action: ((trigger: string, action?: string) => TaggerInstance) &
    ((actions: Record<string, string>) => TaggerInstance);
  actions: ((trigger: string, action?: string) => TaggerInstance) &
    ((actions: Record<string, string>) => TaggerInstance);
  context: ((key: string, value: WalkerOS.Property) => TaggerInstance) &
    ((context: WalkerOS.Properties) => TaggerInstance);
  globals: ((key: string, value: WalkerOS.Property) => TaggerInstance) &
    ((globals: WalkerOS.Properties) => TaggerInstance);
  /**
   * Sets the element's one link (`data-elblink="id:type"`). An element carries
   * one link: a second distinct link, or an object with more than one entry,
   * throws. Repeating the same link is allowed.
   */
  link: ((id: string, type: string) => TaggerInstance) &
    ((link: Record<string, string>) => TaggerInstance);
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
    let currentEntity: string | undefined = undefined; // Only set via .entity() method
    let namingEntity: string | undefined = entity; // Used for data attribute naming
    const dataProperties: Record<string, WalkerOS.Properties> = {};
    const scopedProperties: WalkerOS.Properties = {};
    const actionProperties: Record<string, string> = {};
    const actionsProperties: Record<string, string> = {};
    const contextProperties: WalkerOS.Properties = {};
    const globalProperties: WalkerOS.Properties = {};
    // One link per element: getLink reads data-elblink as a single id:type
    let linkPair: [string, string] | undefined;

    // Backslash-escape what the attribute parser reads as syntax: the
    // separator, quotes and the backslash itself. Values keep their colons,
    // since only the first unescaped colon splits key and value.
    function escapeValue(value: WalkerOS.Property | undefined): string {
      if (!isDefined(value) || value === null) return 'undefined';
      return String(value).replace(/[\\;']/g, '\\$&');
    }

    // A colon in a key would end it, so keys escape it as well.
    function escapeKey(key: string): string {
      return key.replace(/[\\;:']/g, '\\$&');
    }

    // Helper function to serialize key-value pairs
    function serializeKeyValue(obj: WalkerOS.Properties): string {
      return Object.entries(obj)
        .map(([key, value]) => `${escapeKey(key)}:${escapeValue(value)}`)
        .join(';');
    }

    const instance: TaggerInstance = {
      entity(name: string): TaggerInstance {
        currentEntity = name;
        namingEntity = name; // Always update naming scope when entity is set
        return instance;
      },

      data(
        keyOrData: string | WalkerOS.Properties,
        value?: WalkerOS.Property,
      ): TaggerInstance {
        const entityKey = namingEntity ?? '';

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

      scoped(
        keyOrScoped: string | WalkerOS.Properties,
        value?: WalkerOS.Property,
      ): TaggerInstance {
        if (isString(keyOrScoped)) {
          scopedProperties[keyOrScoped] = value;
        } else {
          Object.assign(scopedProperties, keyOrScoped);
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

      actions(
        triggerOrActions: string | Record<string, string>,
        actionValue?: string,
      ): TaggerInstance {
        if (isString(triggerOrActions)) {
          if (isDefined(actionValue)) {
            // Two parameters: trigger and action
            actionsProperties[triggerOrActions] = actionValue;
          } else {
            // Single parameter: could be "trigger:action" or just "trigger"
            if (triggerOrActions.includes(':')) {
              const [trigger, action] = triggerOrActions.split(':', 2);
              actionsProperties[trigger] = action;
            } else {
              actionsProperties[triggerOrActions] = triggerOrActions;
            }
          }
        } else {
          Object.assign(actionsProperties, triggerOrActions);
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
        idOrLink: string | Record<string, string>,
        type?: string,
      ): TaggerInstance {
        const pairs: Array<[string, string]> = isString(idOrLink)
          ? [[idOrLink, type ?? '']]
          : Object.entries(idOrLink);
        const rule = `One link per element: ${prefix}link`;

        if (pairs.length > 1)
          throw new Error(
            `${rule} holds one id and type, got ${pairs.length} (${pairs
              .map(([id]) => id)
              .join(', ')})`,
          );

        const [pair] = pairs;
        if (!pair) return instance;

        if (linkPair && (linkPair[0] !== pair[0] || linkPair[1] !== pair[1]))
          throw new Error(
            `${rule} already holds "${linkPair.join(':')}", got "${pair.join(':')}"`,
          );

        linkPair = pair;
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

        // Add scoped generic attribute (data-elb_): branch-scoped, bubble-up
        // only. Suffix must match Const.Commands.Scoped ('_').
        if (Object.keys(scopedProperties).length > 0) {
          attributes[`${prefix}_`] = serializeKeyValue(scopedProperties);
        }

        // Add action attributes
        if (Object.keys(actionProperties).length > 0) {
          attributes[`${prefix}action`] = serializeKeyValue(actionProperties);
        }

        // Add actions attributes (for all entities)
        if (Object.keys(actionsProperties).length > 0) {
          attributes[`${prefix}actions`] = serializeKeyValue(actionsProperties);
        }

        // Add context attributes
        if (Object.keys(contextProperties).length > 0) {
          attributes[`${prefix}context`] = serializeKeyValue(contextProperties);
        }

        // Add global attributes
        if (Object.keys(globalProperties).length > 0) {
          attributes[`${prefix}globals`] = serializeKeyValue(globalProperties);
        }

        // Add the link attribute
        if (linkPair) {
          attributes[`${prefix}link`] = serializeKeyValue({
            [linkPair[0]]: linkPair[1],
          });
        }

        return attributes;
      },
    };

    return instance;
  };
}
