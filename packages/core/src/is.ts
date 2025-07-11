import type { WalkerOS } from './types';
import { Const } from './constants';

/**
 * Checks if a value is an arguments object.
 *
 * @param value The value to check.
 * @returns True if the value is an arguments object, false otherwise.
 */
export function isArguments(value: unknown): value is IArguments {
  return Object.prototype.toString.call(value) === '[object Arguments]';
}

/**
 * Checks if a value is an array.
 *
 * @param value The value to check.
 * @returns True if the value is an array, false otherwise.
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is a boolean.
 *
 * @param value The value to check.
 * @returns True if the value is a boolean, false otherwise.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if an entity is a walker command.
 *
 * @param entity The entity to check.
 * @returns True if the entity is a walker command, false otherwise.
 */
export function isCommand(entity: string) {
  return entity === Const.Commands.Walker;
}

/**
 * Checks if a value is defined.
 *
 * @param value The value to check.
 * @returns True if the value is defined, false otherwise.
 */
export function isDefined<T>(val: T | undefined): val is T {
  return typeof val !== 'undefined';
}

/**
 * Checks if a value is an element or the document.
 *
 * @param elem The value to check.
 * @returns True if the value is an element or the document, false otherwise.
 */
export function isElementOrDocument(elem: unknown): elem is Element {
  return elem === document || elem instanceof Element;
}

/**
 * Checks if a value is a number.
 *
 * @param value The value to check.
 * @returns True if the value is a number, false otherwise.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Checks if a value is an object.
 *
 * @param value The value to check.
 * @returns True if the value is an object, false otherwise.
 */
export function isObject(value: unknown): value is WalkerOS.AnyObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Checks if two variables have the same type.
 *
 * @param variable The first variable.
 * @param type The second variable.
 * @returns True if the variables have the same type, false otherwise.
 */
export function isSameType<T>(
  variable: unknown,
  type: T,
): variable is typeof type {
  return typeof variable === typeof type;
}

/**
 * Checks if a value is a string.
 *
 * @param value The value to check.
 * @returns True if the value is a string, false otherwise.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
