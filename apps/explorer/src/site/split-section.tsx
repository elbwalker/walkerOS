import React from 'react';

export interface SplitSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Prose column, usually a SectionHead. */
  text: React.ReactNode;
  /** Wider column, usually a Panel or CodePanel. */
  panel: React.ReactNode;
  className?: string;
}

/**
 * SplitSection - asymmetric prose column beside a panel.
 *
 * Both columns carry min-width: 0 in CSS. Without it a grid item containing a
 * <pre> keeps its min-content width and pushes the layout past the viewport.
 */
export function SplitSection({
  text,
  panel,
  className = '',
  ...rest
}: SplitSectionProps) {
  return (
    <div className={`elb-oa-split ${className}`.trim()} {...rest}>
      <div>{text}</div>
      <div>{panel}</div>
    </div>
  );
}

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Panel - elevated surface. Depth carries hierarchy in Open Air, not rules.
 */
export function Panel({ children, className = '', ...rest }: PanelProps) {
  return (
    <div className={`elb-oa-panel ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
