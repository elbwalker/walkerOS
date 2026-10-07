import type { PrismTheme } from 'prism-react-renderer';
import {
  codeBg,
  codeFg,
  syntaxComment,
  syntaxConstant,
  syntaxFunction,
  syntaxKeyword,
  syntaxNamespace,
  syntaxNumber,
  syntaxOperator,
  syntaxPunct,
  syntaxString,
  syntaxTag,
  syntaxType,
} from '@walkeros/explorer/design';

/** The docs code theme: one theme for both colour modes (code is always dark),
 * built from the design constants. */
export const prismTheme: PrismTheme = {
  plain: { color: codeFg, backgroundColor: codeBg },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: syntaxComment, fontStyle: 'italic' },
    },
    {
      types: ['string', 'char', 'attr-value', 'inserted'],
      style: { color: syntaxString },
    },
    { types: ['number'], style: { color: syntaxNumber } },
    {
      types: ['boolean', 'constant', 'null', 'undefined'],
      style: { color: syntaxConstant },
    },
    {
      types: ['keyword', 'selector', 'atrule', 'important'],
      style: { color: syntaxKeyword },
    },
    { types: ['function', 'method'], style: { color: syntaxFunction } },
    {
      types: ['class-name', 'builtin', 'maybe-class-name', 'attr-name'],
      style: { color: syntaxType },
    },
    {
      types: ['operator', 'regex', 'url', 'entity', 'property'],
      style: { color: syntaxOperator },
    },
    { types: ['punctuation'], style: { color: syntaxPunct } },
    { types: ['tag', 'deleted', 'symbol'], style: { color: syntaxTag } },
    { types: ['namespace'], style: { color: syntaxNamespace } },
    { types: ['variable'], style: { color: codeFg } },
  ],
};
