/**
 * walkeros/await-send: a call to a transport helper (`sendServer`, `sendWeb`,
 * `sendWebAsFetch`) must be awaited, returned or otherwise used. A floating
 * send lets the push settle before the request did, so its failure is lost
 * and the event counts as delivered.
 *
 * AST only: the helper is recognized by name, as a member (`env.sendServer`),
 * through a fallback (`env.sendWeb || sendWeb`) and through a local alias or
 * a parameter typed `typeof sendWeb`. A `sendWeb` call whose options name the
 * synchronous `beacon` or `xhr` transport returns its result and throws at
 * once, so it may stand alone.
 */

const HELPERS = ['sendServer', 'sendWeb', 'sendWebAsFetch'];
const SYNC_TRANSPORTS = ['beacon', 'xhr'];
const CHAIN_METHODS = ['then', 'catch', 'finally'];
const WRAPPERS = [
  'ChainExpression',
  'TSNonNullExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
];

function propertyName(node) {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string')
    return node.value;
  return undefined;
}

/** The helper name a callee refers to, or undefined. */
function helperOf(node, aliases) {
  if (!node) return undefined;
  switch (node.type) {
    case 'Identifier':
      if (HELPERS.includes(node.name)) return node.name;
      return aliases.get(node.name);
    case 'MemberExpression': {
      if (node.computed && node.property.type !== 'Literal') return undefined;
      const name = propertyName(node.property);
      return HELPERS.includes(name) ? name : undefined;
    }
    case 'LogicalExpression':
      return helperOf(node.left, aliases) || helperOf(node.right, aliases);
    case 'ConditionalExpression':
      return (
        helperOf(node.consequent, aliases) || helperOf(node.alternate, aliases)
      );
    default:
      if (WRAPPERS.includes(node.type))
        return helperOf(node.expression, aliases);
      return undefined;
  }
}

/** The helper a `typeof <helper>` type annotation names, or undefined. */
function typeofHelper(annotation) {
  const type = annotation && annotation.typeAnnotation;
  if (!type || type.type !== 'TSTypeQuery') return undefined;
  const name = type.exprName && type.exprName.name;
  return HELPERS.includes(name) ? name : undefined;
}

/** Whether a sendWeb call's options select a synchronous transport. */
function isSyncTransport(call) {
  const options = call.arguments[2];
  if (!options || options.type !== 'ObjectExpression') return false;
  return options.properties.some(
    (property) =>
      property.type === 'Property' &&
      propertyName(property.key) === 'transport' &&
      property.value.type === 'Literal' &&
      SYNC_TRANSPORTS.includes(property.value.value),
  );
}

/** Whether the value of an expression is thrown away (a floating promise). */
function isDiscarded(node) {
  let current = node;
  let parent = current.parent;
  while (parent && WRAPPERS.includes(parent.type)) {
    current = parent;
    parent = current.parent;
  }
  if (!parent) return false;
  if (parent.type === 'ExpressionStatement') return true;
  if (parent.type === 'UnaryExpression' && parent.operator === 'void')
    return true;
  // A `.then()`, `.catch()` or `.finally()` chain floats when its end does.
  if (
    parent.type === 'MemberExpression' &&
    parent.object === current &&
    CHAIN_METHODS.includes(propertyName(parent.property)) &&
    parent.parent &&
    parent.parent.type === 'CallExpression' &&
    parent.parent.callee === parent
  )
    return isDiscarded(parent.parent);
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require transport helper calls (sendServer, sendWeb) to be awaited or returned',
    },
    schema: [],
    messages: {
      floating:
        'Await or return this {{name}} call: a floating send settles after the push, so its failure is lost and the event counts as delivered.',
    },
  },
  create(context) {
    const aliases = new Map();

    function addParams(fn) {
      for (const param of fn.params) {
        const helper =
          param.type === 'Identifier'
            ? typeofHelper(param.typeAnnotation)
            : undefined;
        if (helper) aliases.set(param.name, helper);
      }
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier' || !node.init) return;
        const helper =
          helperOf(node.init, aliases) || typeofHelper(node.id.typeAnnotation);
        if (helper) aliases.set(node.id.name, helper);
      },
      FunctionDeclaration: addParams,
      FunctionExpression: addParams,
      ArrowFunctionExpression: addParams,
      CallExpression(node) {
        const name = helperOf(node.callee, aliases);
        if (!name) return;
        if (name !== 'sendServer' && isSyncTransport(node)) return;
        if (isDiscarded(node))
          context.report({ node, messageId: 'floating', data: { name } });
      },
    };
  },
};
