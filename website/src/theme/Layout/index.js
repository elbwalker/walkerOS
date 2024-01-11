import React from 'react';
import Layout from '@theme-original/Layout';
import Walkerjs from '@site/src/components/walkerjs';

export default function LayoutWrapper(props) {
  return (
    <>
      <Walkerjs />
      <Layout {...props} />
    </>
  );
}
