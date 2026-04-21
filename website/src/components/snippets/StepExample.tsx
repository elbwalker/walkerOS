import React from 'react';
import { CodeView, Grid } from '@walkeros/explorer';
import { formatOut } from '@walkeros/core';

type StepEffect = readonly [callable: string, ...args: unknown[]];

type Example = {
  title?: string;
  description?: string;
  in: unknown;
  mapping?: unknown;
  out: readonly StepEffect[] | unknown;
};

type Props = {
  example: Example;
};

function formatOutContent(out: Example['out']): {
  code: string;
  language: string;
} {
  if (Array.isArray(out)) {
    return {
      code: formatOut(out as readonly StepEffect[]),
      language: 'javascript',
    };
  }
  return { code: JSON.stringify(out, null, 2), language: 'json' };
}

export default function StepExample({ example }: Props): React.ReactElement {
  const hasMapping = example.mapping !== undefined;
  const out = formatOutContent(example.out);
  const columns = hasMapping ? 3 : 2;

  return (
    <>
      {example.description && (
        <p className="step-example-description">{example.description}</p>
      )}
      <Grid columns={columns} maxRowHeight={360}>
        <CodeView
          label="Event"
          code={JSON.stringify(example.in, null, 2)}
          language="json"
        />
        {hasMapping && (
          <CodeView
            label="Mapping"
            code={JSON.stringify(example.mapping, null, 2)}
            language="json"
          />
        )}
        <CodeView label="Out" code={out.code} language={out.language} />
      </Grid>
    </>
  );
}
