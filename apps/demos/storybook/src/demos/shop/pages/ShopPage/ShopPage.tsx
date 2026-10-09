import type { ReactElement, ReactNode } from 'react';
import { ViewSource } from '@walkeros/explorer';
import type { DemoPageProps } from '../../../../shared/controls';
import { LanguageProvider } from '../../../../shared/language';
import { ConsentBar } from '../../../../shared/organisms/ConsentBar';
import { Footer } from '../../../../shared/organisms/Footer';
import { Header, HeaderControls } from '../../../../shared/organisms/Header';
import { OnePager } from '../../../../shared/templates/OnePager';
import { CartLink } from '../../molecules/CartLink';
import { Checkout } from '../../organisms/Checkout';
import { OrderComplete } from '../../organisms/OrderComplete';
import { ProductDetail } from '../../organisms/ProductDetail';
import { PromotionHero } from '../../organisms/PromotionHero';
import { Recommendations } from '../../organisms/Recommendations';
import {
  cartValue,
  copyright,
  footerLinks,
  navLinks,
  recommendations,
  type Product,
} from '../../data';

export interface ShopPageProps extends DemoPageProps {
  products?: Product[];
  /** Shows "Add product", which appends a product to the recommendations. */
  onAddProduct?: () => void;
}

// A virtual page sits a feature gap below the previous one, so its
// visibility triggers fire on their own while scrolling. Its id is the
// anchor a navigation link scrolls to.
const VirtualPage = ({ id, children }: { id: string; children: ReactNode }) => (
  <div id={id} className="mt-(--feature-gap) border-t border-border">
    {children}
  </div>
);

/** The shop demo: the static tagging demo as one page, every section tagged. */
export const ShopPage = ({
  controls,
  products = recommendations,
  onAddProduct,
}: ShopPageProps) => {
  const { elb } = controls;
  // Source views sit on the outermost tagged element of a section (the
  // organism's root) or of an entity box (a card); no ancestor carries a
  // click action.
  const source = (element: ReactElement) => (
    <ViewSource elb={elb}>{element}</ViewSource>
  );
  // Cards fill their grid cell as they do unwrapped; sections never stretch
  // (their auto margins would shrink them in a grid).
  const cardSource = (card: ReactElement) => (
    <ViewSource elb={elb} stretch>
      {card}
    </ViewSource>
  );
  const sectionSource = (organism: ReactElement) => (
    <ViewSource elb={elb} className="mx-auto max-w-(--container)">
      {organism}
    </ViewSource>
  );

  return (
    <LanguageProvider language={controls.language}>
      <OnePager
        header={
          <Header
            links={navLinks}
            controls={<HeaderControls controls={controls} />}
            extras={<CartLink cartValue={cartValue} />}
          />
        }
        footer={<Footer links={footerLinks} copyright={copyright} />}
        consent={<ConsentBar {...controls.consent} />}
      >
        {/* Section anchors sit on the page's own containers, never on a
            source view or inside an organism. */}
        <div id="promotion">
          <PromotionHero wrapCard={source} />
        </div>
        <div id="recommendations">
          {sectionSource(
            <Recommendations
              products={products}
              onAddProduct={onAddProduct}
              wrapProduct={cardSource}
            />,
          )}
        </div>
        <VirtualPage id="product">
          {sectionSource(<ProductDetail />)}
        </VirtualPage>
        <VirtualPage id="checkout">{sectionSource(<Checkout />)}</VirtualPage>
        <VirtualPage id="order">{sectionSource(<OrderComplete />)}</VirtualPage>
      </OnePager>
    </LanguageProvider>
  );
};
