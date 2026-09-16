import React from 'react';
import { Panel } from './split-section';

export interface EntityActionPair {
  entity: string;
  action: string;
}

export interface CodePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Static code sample. Not syntax highlighted, by design. */
  code: string;
  /** entity/action chips shown above the code. */
  pairs?: EntityActionPair[];
  caption?: React.ReactNode;
  className?: string;
}

/**
 * CodePanel - entity/action pairs plus a static code block.
 *
 * Deliberately plain: highlighting would mean importing the Monaco or shiki
 * atoms, which drags the tool module graph into the ./site entry that exists
 * to keep marketing pages light.
 */
export function CodePanel({
  code,
  pairs,
  caption,
  className = '',
  ...rest
}: CodePanelProps) {
  return (
    <Panel className={className} {...rest}>
      {pairs && pairs.length > 0 ? (
        <div className="elb-oa-pairs">
          {pairs.map((pair) => (
            <span className="elb-oa-pair" key={`${pair.entity}-${pair.action}`}>
              <span className="elb-oa-pair__entity">{pair.entity}</span>
              <span className="elb-oa-pair__action">{pair.action}</span>
            </span>
          ))}
        </div>
      ) : null}
      <pre className="elb-oa-code">{code}</pre>
      {caption ? <p className="elb-oa-caption">{caption}</p> : null}
    </Panel>
  );
}
