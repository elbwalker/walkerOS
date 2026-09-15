import React from 'react';
import BlogPostItem from '@theme-original/BlogPostItem';
import { tagger } from '@site/src/components/walkerjs';

export default function BlogPostItemWrapper(props) {
  const post = props.children?.type;
  const unknown = 'unknown';
  return (
    <>
      <span
        {...tagger()
          .entity('post')
          .action('load', 'view')
          .action('scroll(50)', 'interest')
          .data({
            id: post?.metadata?.permalink || unknown,
            title: post?.frontMatter?.title || unknown,
            readingTime: post?.metadata?.readingTime || unknown,
          })
          .get()}
      >
        <BlogPostItem {...props} />
      </span>
    </>
  );
}
