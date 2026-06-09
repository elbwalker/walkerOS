import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Tag } from '../tag-atom';
import type { TagType } from '../types';

describe('Tag atom', () => {
  const types: TagType[] = [
    'global',
    'context',
    'entity',
    'action',
    'property',
  ];

  it.each(types)(
    'renders the %s type with its modifier class and data-kind',
    (type) => {
      const { container, getByText } = render(
        <Tag type={type} name={`${type}-name`} />,
      );
      const box = container.querySelector('.elb-tag-skeleton__box');

      expect(box).not.toBeNull();
      expect(box).toHaveClass(`elb-tag-skeleton__box--${type}`);
      expect(box).toHaveAttribute('data-kind', type);
      expect(box).toHaveAttribute('data-name', `${type}-name`);
      expect(getByText(`${type}-name`)).toBeInTheDocument();
    },
  );

  it('renders the value text once, in the body', () => {
    const { getAllByText } = render(
      <Tag type="property" name="price" value="29.99" />,
    );
    expect(getAllByText('29.99')).toHaveLength(1);
  });

  it('passes the inline style through', () => {
    const { container } = render(
      <Tag type="entity" name="product" style={{ left: '10%' }} />,
    );
    const box = container.querySelector('.elb-tag-skeleton__box');
    expect(box).toHaveStyle({ left: '10%' });
  });

  it('adds the selected and dragging modifier classes', () => {
    const { container } = render(
      <Tag type="entity" name="product" selected dragging />,
    );
    const box = container.querySelector('.elb-tag-skeleton__box');
    expect(box).toHaveClass('elb-tag-skeleton__box--selected');
    expect(box).toHaveClass('elb-tag-skeleton__box--dragging');
  });

  it('omits the selected and dragging modifiers by default', () => {
    const { container } = render(<Tag type="entity" name="product" />);
    const box = container.querySelector('.elb-tag-skeleton__box');
    expect(box).not.toHaveClass('elb-tag-skeleton__box--selected');
    expect(box).not.toHaveClass('elb-tag-skeleton__box--dragging');
  });

  it('shows only the name in the tab, never the context index', () => {
    const { container } = render(
      <Tag type="context" name="test" contextIndex={0} />,
    );
    const tab = container.querySelector('.elb-tag-skeleton__tab');
    expect(tab).not.toBeNull();
    // The tab carries only the identifier; the index is not rendered.
    expect(tab).toHaveTextContent('test');
    expect(tab?.textContent).toBe('test');
  });

  it('keeps the tab visible by default and hides it via showCaption=false', () => {
    const { container, rerender } = render(
      <Tag type="entity" name="product" />,
    );
    const box = container.querySelector('.elb-tag-skeleton__box');
    expect(box).not.toHaveClass('elb-tag-skeleton__box--no-caption');

    rerender(<Tag type="entity" name="product" showCaption={false} />);
    expect(box).toHaveClass('elb-tag-skeleton__box--no-caption');
    // The box and tab still exist; only the modifier toggles (geometry stable).
    expect(container.querySelector('.elb-tag-skeleton__tab')).not.toBeNull();
  });

  it('renders the optional label and nested children', () => {
    const { container, getByText, getByTestId } = render(
      <Tag type="entity" name="product" label="click:add">
        <span data-testid="child">nested</span>
      </Tag>,
    );
    expect(getByText('click:add')).toBeInTheDocument();
    expect(getByTestId('child')).toBeInTheDocument();
    expect(container.querySelector('.elb-tag-skeleton__body')).toContainElement(
      getByTestId('child'),
    );
  });
});
