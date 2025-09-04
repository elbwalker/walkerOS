import { ArrowDownIcon } from '@storybook/icons';
import React, { Fragment, useState, memo } from 'react';
import { styled } from 'storybook/theming';

type Item = {
  title: string | React.ReactNode;
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
  padding: '6px 12px',
  paddingLeft: 9,
  background: 'none',
  color: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  borderLeft: '3px solid transparent',
  width: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',

  '&:focus': {
    outline: '0 none',
    borderLeft: `3px solid ${theme.color.secondary}`,
  },

  '& .event-base': {
    color: 'inherit',
    fontWeight: '500',
  },

  '& .event-separator': {
    color: theme.color.mediumdark,
    fontWeight: '300',
  },

  '& .event-preview': {
    color: theme.color.mediumdark,
    fontWeight: '400',
  },
}));

const Description = styled.div(({ theme }) => ({
  padding: theme.layoutMargin,
  background: theme.background.content,
  fontFamily: theme.typography.fonts.mono,
  whiteSpace: 'pre-wrap',
  textAlign: 'left',
}));

export const ListItem: React.FC<ListItemProps> = memo(({ item }) => {
  const [isOpen, onToggle] = useState(false);

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
});

export const List: React.FC<ListProps> = memo(({ items }) => (
  <ListWrapper>
    {items.map((item, idx) => (
      <ListItem key={`${item.title}-${idx}`} item={item}></ListItem>
    ))}
  </ListWrapper>
));
