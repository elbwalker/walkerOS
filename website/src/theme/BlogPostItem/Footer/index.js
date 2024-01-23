import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import { tagger } from '@site/src/components/walkerjs';

export default function FooterWrapper(props) {
  return (
    <>
      <span {...tagger.action('visible', 'read')}>
        <Footer {...props} />
      </span>
    </>
  );
}
