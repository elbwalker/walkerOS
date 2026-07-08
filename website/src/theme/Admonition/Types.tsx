import React, { type ReactNode } from 'react';
import DefaultAdmonitionTypes from '@theme-original/Admonition/Types';
import Admonition from '@theme-original/Admonition';

interface CloudAdmonitionProps {
  children: ReactNode;
  title?: ReactNode;
}

function CloudAdmonition({ children, title }: CloudAdmonitionProps): ReactNode {
  return (
    <Admonition
      type="info"
      icon="☁️"
      title={title ?? 'walkerOS Cloud'}
      className="admonition-cloud"
    >
      {children}
    </Admonition>
  );
}

export default {
  ...DefaultAdmonitionTypes,
  cloud: CloudAdmonition,
};
