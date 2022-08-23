import { Elbwalker, Walker } from '../types';
export declare function trycatch<P extends unknown[], R>(fn: (...args: P) => R | undefined): (...args: P) => R | undefined;
export declare function randomString(): string;
export declare function getGlobalProperties(prefix: string): Elbwalker.AnyObject;
export declare function splitAttribute(str: string, separator?: string): Walker.Values;
export declare function parseAttribute(str: string): string[];
export declare function getAttribute(element: Element, name: string): string;
export declare function assign(base: Elbwalker.AnyObject, props?: Elbwalker.AnyObject): Elbwalker.AnyObject;
export declare function isArgument(event: unknown): boolean;
