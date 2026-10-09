import React from 'react';
import BlogLayout from '@theme-original/BlogLayout';
import { tagger } from '@site/src/components/tagger';

export default function BlogLayoutWrapper(props) {
  return (
    <>
      <span {...tagger().globals('pagegroup', 'blog').get()}>
        <BlogLayout {...props} />
      </span>
    </>
  );
}
