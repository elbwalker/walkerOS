/**
 * walkeros/no-silent-return: a bare `return;` (or `return undefined;`,
 * `return void x;`) inside a destination's `push` or `pushBatch` ends the
 * push as if the event was delivered, so a skipped event is counted as sent
 * and nothing is logged. Throw a `StepError` that
 * names why (a missing setting is `config`, a missing input `missing-input`)
 * instead. Other functions (`init`, `on`, helpers) are not checked.
 *
 * AST only: a push function is the value of a `push` or `pushBatch`
 * property or method, a variable of that name, or a function declaration of
 * that name. Returns inside functions nested in it belong to those.
 */

const PUSH_NAMES = ['push', 'pushBatch'];

function keyName(node) {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string')
    return node.value;
  return undefined;
}

/** A return value that is nothing: none, `undefined` or a `void` expression. */
function isSilent(argument) {
  if (argument === null) return true;
  if (argument.type === 'Identifier') return argument.name === 'undefined';
  return argument.type === 'UnaryExpression' && argument.operator === 'void';
}

/** Whether a function node is a destination's push or pushBatch. */
function isPushFunction(fn) {
  if (fn.type === 'FunctionDeclaration')
    return PUSH_NAMES.includes(fn.id && fn.id.name);
  const parent = fn.parent;
  if (!parent) return false;
  if (
    (parent.type === 'Property' || parent.type === 'MethodDefinition') &&
    parent.value === fn &&
    !parent.computed
  )
    return PUSH_NAMES.includes(keyName(parent.key));
  if (parent.type === 'VariableDeclarator' && parent.init === fn)
    return PUSH_NAMES.includes(keyName(parent.id));
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow a bare return in a destination's push or pushBatch",
    },
    schema: [],
    messages: {
      silent:
        'A bare return ends this push as delivered: throw a StepError that names why the event is not sent (code config or missing-input).',
    },
  },
  create(context) {
    const stack = [];
    const enter = (fn) => stack.push(isPushFunction(fn));
    const exit = () => stack.pop();

    return {
      FunctionDeclaration: enter,
      FunctionExpression: enter,
      ArrowFunctionExpression: enter,
      'FunctionDeclaration:exit': exit,
      'FunctionExpression:exit': exit,
      'ArrowFunctionExpression:exit': exit,
      ReturnStatement(node) {
        if (isSilent(node.argument) && stack[stack.length - 1] === true)
          context.report({ node, messageId: 'silent' });
      },
    };
  },
};
