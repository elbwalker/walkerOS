/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'prism-react-renderer' {
  import React from 'react';

  export interface Token {
    types: string[];
    content: string;
    empty?: boolean;
  }

  export interface LineProps {
    key?: React.Key;
    style?: React.CSSProperties;
    className?: string;
    line: Token[];
    [otherProp: string]: any;
  }

  export interface TokenProps {
    key?: React.Key;
    style?: React.CSSProperties;
    className?: string;
    token: Token;
    [otherProp: string]: any;
  }

  export interface RenderProps {
    tokens: Token[][];
    getLineProps(input: { line: Token[]; key?: React.Key }): LineProps;
    getTokenProps(input: { token: Token; key?: React.Key }): TokenProps;
  }

  export interface HighlightProps {
    code: string;
    language: string;
    theme?: any;
    children: (props: RenderProps) => React.ReactElement;
  }

  export const Highlight: React.FC<HighlightProps>;

  export const themes: {
    [key: string]: any;
    palenight: any;
  };
}
