import React from 'react';
import Layout from '@theme-original/Layout';
import { DataCollection, tagger } from '@site/src/components/walkerjs';

export default function LayoutWrapper(props) {
  return (
    <>
      <DataCollection />
      <span {...tagger.globals('pagegroup', 'content')}>
        <Layout {...props} />
      </span>
    </>
  );
}
