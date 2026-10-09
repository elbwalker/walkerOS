import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import { tagger } from '@site/src/components/tagger';

export default function FooterWrapper(props) {
  return (
    <>
      <span {...tagger().action('visible', 'read').get()}>
        <Footer {...props} />
      </span>
    </>
  );
}
