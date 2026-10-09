import React from 'react';
import Content from '@theme-original/NotFound/Content';
import { tagger } from '@site/src/components/tagger';

export default function ContentWrapper(props) {
  return (
    <>
      <span {...tagger('404').entity('404').action('load', 'view').get()}>
        <Content {...props} />
      </span>
    </>
  );
}
