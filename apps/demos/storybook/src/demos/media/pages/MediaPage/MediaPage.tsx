import { Fragment, useState, type ReactElement } from 'react';
import { ViewSource } from '@walkeros/explorer';
import logoImg from '../../../../assets/logo.png';
import { Button } from '../../../../shared/atoms/Button';
import { Link } from '../../../../shared/atoms/Link';
import type { DemoPageProps } from '../../../../shared/controls';
import { LanguageProvider, useText } from '../../../../shared/language';
import { ConsentBar } from '../../../../shared/organisms/ConsentBar';
import { Footer } from '../../../../shared/organisms/Footer';
import { Header, HeaderControls } from '../../../../shared/organisms/Header';
import { createTrackingProps } from '../../../../shared/tagger';
import { OnePager } from '../../../../shared/templates/OnePager';
import { SearchButton } from '../../molecules/SearchButton';
import { CarouselSection } from '../../organisms/CarouselSection';
import { HeroBanner } from '../../organisms/HeroBanner';
import { PromotionBanner } from '../../organisms/PromotionBanner';
import {
  copyright,
  documentaries,
  extraRows,
  filmRecommendations,
  footerLinks,
  hero,
  navLinks,
  promotion,
  topSeries,
} from '../../data';

const MediaContent = ({ controls }: DemoPageProps) => {
  const t = useText();
  const [extraRowCount, setExtraRowCount] = useState(0);
  const { elb } = controls;
  // Source views sit on the outermost tagged element of a section (the
  // organism's root) or of a card; no ancestor carries a click action.
  const sectionSource = (organism: ReactElement) => (
    <ViewSource elb={elb}>{organism}</ViewSource>
  );
  // Cards fill their slot in the carousel row and keep their width in it
  // (shrink-0): the row scrolls, it never squeezes a card.
  const cardSource = (card: ReactElement) => (
    <ViewSource elb={elb} stretch className="shrink-0">
      {card}
    </ViewSource>
  );

  return (
    // The page context the media demo has always sent, its first component
    // name included.
    <div
      {...createTrackingProps(
        { context: { stage: 'inspo' } },
        'MediathekTemplate',
      )}
    >
      <OnePager
        header={
          <Header
            brand={
              <Link href="#hero">
                <img
                  src={logoImg}
                  alt={t('Media Platform')}
                  className="h-8 w-auto"
                />
              </Link>
            }
            links={navLinks}
            controls={<HeaderControls controls={controls} />}
            extras={<SearchButton />}
          />
        }
        footer={<Footer links={footerLinks} copyright={copyright} />}
        consent={<ConsentBar {...controls.consent} />}
      >
        {/* data-elbobserve: the walker auto-registers rows added below at
            runtime, so a new row's tagged items fire their events without a
            walker re-run. Section anchors sit on the page's own containers,
            never on a source view or inside an organism. */}
        <div data-elbobserve="">
          <div id="hero">{sectionSource(<HeroBanner {...hero} />)}</div>
          <div id="series">
            {sectionSource(
              <CarouselSection {...topSeries} wrapItem={cardSource} />,
            )}
          </div>
          <div id="films">
            {sectionSource(
              <CarouselSection
                {...filmRecommendations}
                type="postcard"
                wrapItem={cardSource}
              />,
            )}
          </div>
          <div id="promotion">
            {sectionSource(<PromotionBanner {...promotion} />)}
          </div>
          <div id="documentaries">
            {sectionSource(
              <CarouselSection {...documentaries} wrapItem={cardSource} />,
            )}
          </div>

          {Array.from({ length: extraRowCount }, (_, index) => {
            const row = extraRows[index % extraRows.length];
            return (
              <Fragment key={`extra-${index}`}>
                {sectionSource(
                  <CarouselSection
                    title={`${row.title} #${index + 1}`}
                    items={row.items}
                    wrapItem={cardSource}
                  />,
                )}
              </Fragment>
            );
          })}

          <div className="mx-auto max-w-7xl px-6 py-6">
            <Button
              variant="secondary"
              onClick={() => setExtraRowCount((count) => count + 1)}
            >
              {t('Add row')}
            </Button>
          </div>
        </div>
      </OnePager>
    </div>
  );
};

/** The media demo: a streaming site as one page, every section tagged. */
export const MediaPage = ({ controls }: DemoPageProps) => (
  <LanguageProvider language={controls.language}>
    <MediaContent controls={controls} />
  </LanguageProvider>
);
