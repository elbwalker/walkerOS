import { useState } from 'react';
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
            walker re-run. Section anchors sit on the page's own containers. */}
        <div data-elbobserve="">
          <div id="hero">
            <HeroBanner {...hero} />
          </div>
          <div id="series">
            <CarouselSection {...topSeries} />
          </div>
          <div id="films">
            <CarouselSection {...filmRecommendations} type="postcard" />
          </div>
          <div id="promotion">
            <PromotionBanner {...promotion} />
          </div>
          <div id="documentaries">
            <CarouselSection {...documentaries} />
          </div>

          {Array.from({ length: extraRowCount }, (_, index) => {
            const row = extraRows[index % extraRows.length];
            return (
              <CarouselSection
                key={`extra-${index}`}
                title={`${row.title} #${index + 1}`}
                items={row.items}
              />
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
