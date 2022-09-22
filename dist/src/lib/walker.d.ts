import { Walker } from '../types';
export declare function walker(target: Element, trigger: Walker.Trigger, prefix?: string): Walker.Events;
export declare function resolveAttributes(prefix: string, target: Element, trigger: Walker.Trigger): Walker.TriggerActions;
export declare function getElbAttributeName(prefix: string, name?: string, isProperty?: boolean): string;
export declare function getElbValues(prefix: string, element: Element, name: string, isProperty?: boolean): Walker.Values;
