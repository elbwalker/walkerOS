import React from 'react';
import Content from '@theme-original/DocItem/Content';
import SupportNotice from '@site/src/components/organisms/supportNotice';

export default function ContentWrapper(props) {
  return (
    <>
      <Content {...props} />
      <SupportNotice />
    </>
  );
}
