import React from 'react';
import Content from '@theme-original/NotFound/Content';
import { tagger } from '@site/src/components/walkerjs';

export default function ContentWrapper(props) {
  return (
    <>
      <span {...tagger().entity('404').action('load', 'view').get()}>
        <Content {...props} />
      </span>
    </>
  );
}
