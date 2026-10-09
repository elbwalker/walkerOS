import React from 'react';
import Layout from '@theme-original/Layout';
import { DataCollection } from '@site/src/components/walkerjs';
import { tagger } from '@site/src/components/tagger';

export default function LayoutWrapper(props) {
  return (
    <>
      <DataCollection />
      <span {...tagger().globals('pagegroup', 'content').get()}>
        <Layout {...props} />
      </span>
    </>
  );
}
