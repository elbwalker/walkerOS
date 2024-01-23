import React from 'react';
import Layout from '@theme-original/DocRoot/Layout';
import { tagger } from '@site/src/components/walkerjs';

export default function LayoutWrapper(props) {
  return (
    <>
      <span {...tagger.globals('pagegroup', 'docs')}>
        <Layout {...props} />
      </span>
    </>
  );
}
