import type { ReactElement, ReactNode } from 'react';
import { ViewSource, type ViewSourceProps } from '@walkeros/explorer';
import { ConsentBar, type ConsentState } from '../../organisms/ConsentBar';
import { Checkout } from '../../organisms/Checkout';
import { Footer } from '../../organisms/Footer';
import { Header } from '../../organisms/Header';
import { OrderComplete } from '../../organisms/OrderComplete';
import { ProductDetail } from '../../organisms/ProductDetail';
import { PromotionHero } from '../../organisms/PromotionHero';
import { Recommendations } from '../../organisms/Recommendations';
import { ShopLayout } from '../../templates/ShopLayout';
import { recommendations, type Product } from '../../data';

export interface TaggingDemoProps {
  consentState: ConsentState;
  consentNotice?: string;
  onConsentAccept: () => void;
  onConsentDeny: () => void;
  onConsentReset: () => void;
  products?: Product[];
  onAddProduct?: () => void;
  /** The page's elb, for `walker init` after an edit in the source view. */
  elb?: ViewSourceProps['elb'];
}

// A virtual page sits a feature gap below the previous one, so its
// visibility triggers fire on their own while scrolling. Its id is the
// anchor a navigation link scrolls to.
const VirtualPage = ({ id, children }: { id: string; children: ReactNode }) => (
  <div id={id} className="mt-(--feature-gap) border-t border-border">
    {children}
  </div>
);

/** The static tagging demo as a page: one shop, every section tagged. */
export const TaggingDemo = ({
  consentState,
  consentNotice,
  onConsentAccept,
  onConsentDeny,
  onConsentReset,
  products = recommendations,
  onAddProduct,
  elb,
}: TaggingDemoProps) => {
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
    <ShopLayout
      header={<Header />}
      footer={<Footer />}
      consent={
        <ConsentBar
          state={consentState}
          notice={consentNotice}
          onAccept={onConsentAccept}
          onDeny={onConsentDeny}
          onReset={onConsentReset}
        />
      }
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
      <VirtualPage id="product">{sectionSource(<ProductDetail />)}</VirtualPage>
      <VirtualPage id="checkout">{sectionSource(<Checkout />)}</VirtualPage>
      <VirtualPage id="order">{sectionSource(<OrderComplete />)}</VirtualPage>
    </ShopLayout>
  );
};
