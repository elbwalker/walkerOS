import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import { formatOut } from '@walkeros/core';

type StepEffect = readonly [callable: string, ...args: unknown[]];

type Example = {
  in: unknown;
  mapping?: unknown;
  out: readonly StepEffect[] | unknown;
};

type Props = {
  example: Example;
};

export default function StepExample({ example }: Props): React.ReactElement {
  return (
    <>
      <h4>In</h4>
      <CodeBlock language="json">
        {JSON.stringify(example.in, null, 2)}
      </CodeBlock>
      {example.mapping !== undefined && (
        <>
          <h4>Mapping</h4>
          <CodeBlock language="json">
            {JSON.stringify(example.mapping, null, 2)}
          </CodeBlock>
        </>
      )}
      <h4>Out</h4>
      {Array.isArray(example.out) ? (
        <CodeBlock language="javascript">
          {formatOut(example.out as readonly StepEffect[])}
        </CodeBlock>
      ) : (
        <CodeBlock language="json">
          {JSON.stringify(example.out, null, 2)}
        </CodeBlock>
      )}
    </>
  );
}
