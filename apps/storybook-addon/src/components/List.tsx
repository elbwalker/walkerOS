import { ArrowDownIcon } from '@storybook/icons';
import React, { Fragment, useState } from 'react';
import { styled } from 'storybook/theming';

type Item = {
  title: string;
  content: string | React.ReactNode;
};

interface ListItemProps {
  item: Item;
}

interface ListProps {
  items: Item[];
}

const ListWrapper = styled.ul({
  listStyle: 'none',
  fontSize: 14,
  padding: 0,
  margin: 0,
});

const Wrapper = styled.div(({ theme }) => ({
  display: 'flex',
  width: '100%',
  borderBottom: `1px solid ${theme.appBorderColor}`,
  '&:hover': {
    background: theme.background.hoverable,
  },
}));

const Icon = styled(ArrowDownIcon)(({ theme }) => ({
  height: 10,
  width: 10,
  minWidth: 10,
  color: theme.color.mediumdark,
  marginRight: 10,
  transition: 'transform 0.1s ease-in-out',
  alignSelf: 'center',
  display: 'inline-flex',
}));

const HeaderBar = styled.div(({ theme }) => ({
  padding: theme.layoutMargin,
  paddingLeft: theme.layoutMargin - 3,
  background: 'none',
  color: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  borderLeft: '3px solid transparent',
  width: '100%',

  '&:focus': {
    outline: '0 none',
    borderLeft: `3px solid ${theme.color.secondary}`,
  },
}));

const Description = styled.div(({ theme }) => ({
  padding: theme.layoutMargin,
  background: theme.background.content,
  fontFamily: theme.typography.fonts.mono,
  whiteSpace: 'pre-wrap',
  textAlign: 'left',
}));

export const ListItem: React.FC<ListItemProps> = ({ item }) => {
  const [isOpen, onToggle] = useState(true);

  return (
    <Fragment>
      <Wrapper>
        <HeaderBar onClick={() => onToggle(!isOpen)} role="button">
          <Icon
            style={{
              transform: `rotate(${isOpen ? 0 : -90}deg)`,
            }}
          />
          {item.title}
        </HeaderBar>
      </Wrapper>
      {isOpen ? <Description>{item.content}</Description> : null}
    </Fragment>
  );
};

export const List: React.FC<ListProps> = ({ items }) => (
  <ListWrapper>
    {items.map((item, idx) => (
      <ListItem key={idx} item={item}></ListItem>
    ))}
  </ListWrapper>
);
