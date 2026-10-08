import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '../../../design/components/atoms/Button';
import { Card } from '../../../design/components/atoms/Card';
import { PhotoPlaceholder } from '../../../design/components/atoms/PhotoPlaceholder';
import { Text } from '../../../design/components/atoms/Text';
import { productCardHtml, productCardMarkup } from '../product-card.demo';

// The demo card is written into the preview as an HTML string, so its design
// markup is spelled out once there; each piece must stay what the design
// component renders.
describe('product card demo', () => {
  it('opens with the Card atom', () => {
    const card = renderToStaticMarkup(
      <Card
        padding="sm"
        className="product-card"
        data-elb="product"
        data-elbaction="load:view"
        data-elbcontext="stage:inspire"
      >
        ~
      </Card>,
    );
    expect(card).toBe(`${productCardMarkup.cardOpen}~</div>`);
  });

  it.each<[keyof typeof productCardMarkup, React.ReactElement]>([
    [
      'photo',
      <PhotoPlaceholder key="photo" tone="viz" className="product-photo" />,
    ],
    [
      'badge',
      <Text key="badge" data-elb-product="badge:delicious">
        Delicious
      </Text>,
    ],
    [
      'price',
      <Text key="price" tone="fg" data-elb-product="price:2.50">
        € 2.50 <s data-elb-product="old_price:3.14">€ 3.14</s>
      </Text>,
    ],
    [
      'add',
      <Button key="add" block data-elbaction="click:add">
        Add to Cart
      </Button>,
    ],
    [
      'save',
      <Button key="save" variant="secondary" block data-elbaction="click:save">
        Maybe later
      </Button>,
    ],
  ])('spells %s as the design component renders it', (part, element) => {
    expect(renderToStaticMarkup(element)).toBe(productCardMarkup[part]);
  });

  it('uses every piece of design markup in the card', () => {
    for (const markup of Object.values(productCardMarkup))
      expect(productCardHtml).toContain(markup);
  });
});
