import React from 'react';
import Content from '@theme-original/DocItem/Content';
import MarkdownActions from '@site/src/components/organisms/markdownActions';
import SupportNotice from '@site/src/components/organisms/supportNotice';

export default function ContentWrapper(props) {
  return (
    <>
      <MarkdownActions />
      <Content {...props} />
      <SupportNotice />
    </>
  );
}
