import React from 'react';
import BlogLayout from '@theme-original/BlogLayout';
import { tagger } from '@site/src/components/walkerjs';

export default function BlogLayoutWrapper(props) {
  return (
    <>
      <span {...tagger.globals('pagegroup', 'blog')}>
        <BlogLayout {...props} />
      </span>
    </>
  );
}
