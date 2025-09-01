import type { Flow } from '@walkeros/core';
import { ParseError } from '../types';

/**
 * Parse and validate Flow configuration
 */
export function parseFlowConfig(input: unknown): Flow.Config {
  try {
    if (!input || typeof input !== 'object') {
      throw new ParseError('Flow config must be an object');
    }

    const config = input as Record<string, unknown>;

    // Validate packages array
    if (!Array.isArray(config.packages)) {
      throw new ParseError('Flow config must have a packages array');
    }

    for (const [index, pkg] of config.packages.entries()) {
      validatePackage(pkg, index);
    }

    // Validate nodes array
    if (!Array.isArray(config.nodes)) {
      throw new ParseError('Flow config must have a nodes array');
    }

    for (const [index, node] of config.nodes.entries()) {
      validateNode(node, index);
    }

    // Validate edges array
    if (!Array.isArray(config.edges)) {
      throw new ParseError('Flow config must have an edges array');
    }

    for (const [index, edge] of config.edges.entries()) {
      validateEdge(edge, index);
    }

    return config as unknown as Flow.Config;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError('Unexpected error parsing flow config', { error });
  }
}

/**
 * Validate package configuration
 */
function validatePackage(pkg: unknown, index: number): void {
  const prefix = `packages[${index}]`;

  if (!pkg || typeof pkg !== 'object') {
    throw new ParseError(`${prefix} must be an object`);
  }

  const packageObj = pkg as Record<string, unknown>;

  if (!packageObj.name || typeof packageObj.name !== 'string') {
    throw new ParseError(`${prefix} must have a name string`);
  }

  if (!packageObj.version || typeof packageObj.version !== 'string') {
    throw new ParseError(`${prefix} must have a version string`);
  }

  if (!packageObj.type || typeof packageObj.type !== 'string') {
    throw new ParseError(`${prefix} must have a type string`);
  }

  const validTypes: Flow.PackageType[] = [
    'core',
    'collector',
    'source',
    'destination',
  ];
  if (!validTypes.includes(packageObj.type as Flow.PackageType)) {
    throw new ParseError(
      `${prefix} type must be one of: ${validTypes.join(', ')}`,
    );
  }
}

/**
 * Validate node configuration
 */
function validateNode(node: unknown, index: number): void {
  const prefix = `nodes[${index}]`;

  if (!node || typeof node !== 'object') {
    throw new ParseError(`${prefix} must be an object`);
  }

  const nodeObj = node as Record<string, unknown>;

  if (!nodeObj.id || typeof nodeObj.id !== 'string') {
    throw new ParseError(`${prefix} must have an id string`);
  }

  if (!nodeObj.type || typeof nodeObj.type !== 'string') {
    throw new ParseError(`${prefix} must have a type string`);
  }

  const validNodeTypes = ['source', 'collector', 'destination'];
  if (!validNodeTypes.includes(nodeObj.type as string)) {
    throw new ParseError(
      `${prefix} type must be one of: ${validNodeTypes.join(', ')}`,
    );
  }

  if (!nodeObj.package || typeof nodeObj.package !== 'string') {
    throw new ParseError(`${prefix} must have a package string`);
  }

  if (!nodeObj.config || typeof nodeObj.config !== 'object') {
    throw new ParseError(`${prefix} must have a config object`);
  }
}

/**
 * Validate edge configuration
 */
function validateEdge(edge: unknown, index: number): void {
  const prefix = `edges[${index}]`;

  if (!edge || typeof edge !== 'object') {
    throw new ParseError(`${prefix} must be an object`);
  }

  const edgeObj = edge as Record<string, unknown>;

  if (!edgeObj.id || typeof edgeObj.id !== 'string') {
    throw new ParseError(`${prefix} must have an id string`);
  }

  if (!edgeObj.source || typeof edgeObj.source !== 'string') {
    throw new ParseError(`${prefix} must have a source string`);
  }

  if (!edgeObj.target || typeof edgeObj.target !== 'string') {
    throw new ParseError(`${prefix} must have a target string`);
  }
}
