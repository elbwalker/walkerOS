import { Walker } from '../types';
export declare function getElbAttributeName(prefix: string, name?: string, isProperty?: boolean): string;
export declare function getElbValues(prefix: string, element: Element, name: string, isProperty?: boolean): Walker.Properties;
export declare function getEvents(target: Element, trigger: Walker.Trigger, prefix?: string): Walker.Events;
export declare function getGlobals(prefix: string): Walker.Properties;
export declare function getTriggerActions(str: string): Walker.TriggersActionGroups;
