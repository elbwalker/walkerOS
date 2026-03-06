import React from 'react';
import type { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '../../../lib/utils';

export interface FlowItem {
  icon: ReactNode;
  label: string;
}

export interface FlowSection {
  title: string;
  items: FlowItem[];
}

export interface FlowColumn {
  title: string;
  sections: FlowSection[];
}

export interface ArchitectureFlowProps {
  sources: FlowColumn;
  center: ReactNode;
  centerTitle?: string;
  destinations: FlowColumn;
  arrowRight?: ReactNode;
  arrowDown?: ReactNode;
  className?: string;
}

export function ArchitectureFlow({
  sources,
  center,
  centerTitle,
  destinations,
  arrowRight = <Icon icon="mdi:arrow-right" />,
  arrowDown = <Icon icon="mdi:arrow-down" />,
  className,
}: ArchitectureFlowProps) {
  return (
    <div className={cn('elb-architecture-flow', className)}>
      <div className="elb-architecture-flow__grid">
        <span className="elb-architecture-flow__title elb-architecture-flow__title--desktop">
          {sources.title}
        </span>
        <div className="elb-architecture-flow__spacer" />
        <span className="elb-architecture-flow__title elb-architecture-flow__title--desktop">
          {centerTitle}
        </span>
        <div className="elb-architecture-flow__spacer" />
        <span className="elb-architecture-flow__title elb-architecture-flow__title--desktop">
          {destinations.title}
        </span>

        <div className="elb-architecture-flow__column">
          <span className="elb-architecture-flow__title elb-architecture-flow__title--mobile">
            {sources.title}
          </span>
          <div className="elb-architecture-flow__sections">
            {sources.sections.map((section) => (
              <FlowSectionBox key={section.title} section={section} />
            ))}
          </div>
        </div>

        <div className="elb-architecture-flow__arrow elb-architecture-flow__arrow--desktop">
          {arrowRight}
        </div>
        <div className="elb-architecture-flow__arrow elb-architecture-flow__arrow--mobile">
          {arrowDown}
        </div>

        <div className="elb-architecture-flow__center">
          <span className="elb-architecture-flow__title elb-architecture-flow__title--mobile">
            {centerTitle}
          </span>
          <div className="elb-architecture-flow__center-content">{center}</div>
        </div>

        <div className="elb-architecture-flow__arrow elb-architecture-flow__arrow--desktop">
          {arrowRight}
        </div>
        <div className="elb-architecture-flow__arrow elb-architecture-flow__arrow--mobile">
          {arrowDown}
        </div>

        <div className="elb-architecture-flow__column">
          <span className="elb-architecture-flow__title elb-architecture-flow__title--mobile">
            {destinations.title}
          </span>
          <div className="elb-architecture-flow__sections">
            {destinations.sections.map((section) => (
              <FlowSectionBox key={section.title} section={section} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowSectionBox({ section }: { section: FlowSection }) {
  return (
    <div className="elb-architecture-flow__section">
      <span className="elb-architecture-flow__section-title">
        {section.title}
      </span>
      <div className="elb-architecture-flow__items">
        {section.items.map((item) => (
          <div key={item.label} className="elb-architecture-flow__item">
            <span className="elb-architecture-flow__item-icon">
              {item.icon}
            </span>
            <span className="elb-architecture-flow__item-label">
              {item.label}
            </span>
          </div>
        ))}
        <span className="elb-architecture-flow__more">and more…</span>
      </div>
    </div>
  );
}
