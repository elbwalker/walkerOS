import React from 'react';

export interface Proof {
  claim: React.ReactNode;
  /** The evidence for the claim, shown in the same card. */
  witness: React.ReactNode;
}

export interface ProofGridProps extends React.HTMLAttributes<HTMLDivElement> {
  items: Proof[];
  className?: string;
}

/**
 * ProofGrid - each claim paired with its witness, one card each.
 *
 * The pairing is the point: a claim carries its evidence in the same screen,
 * so the two are one unit and never separated.
 */
export function ProofGrid({ items, className = '', ...rest }: ProofGridProps) {
  return (
    <div className={`elb-oa-proofs ${className}`.trim()} {...rest}>
      {items.map((item, index) => (
        <div className="elb-oa-proof" key={index}>
          <b className="elb-oa-proof__claim">{item.claim}</b>
          <span className="elb-oa-proof__witness">{item.witness}</span>
        </div>
      ))}
    </div>
  );
}
