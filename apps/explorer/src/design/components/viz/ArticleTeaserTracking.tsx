import React, { useEffect, useRef, useState, type HTMLAttributes } from 'react';
import { cx } from '../cx';
import { EventLegend } from '../atoms/EventLegend';
import { PhotoPlaceholder } from '../atoms/PhotoPlaceholder';
import {
  TEASER_CAPTIONS,
  TEASER_ENTITY,
  TEASER_ITEMS,
  TEASER_PAGES,
  TEASER_PAGE_IDS,
  TEASER_STEPS,
  teaserAdvance,
  teaserStepEnd,
  teaserStepStart,
  type TeaserArticle,
  type TeaserEffect,
  type TeaserPage,
  type TeaserStep,
} from './data/article-teaser';
import { CodeLine, CodeTokens } from './parts/CodeTokens';
import { useInView, useReducedMotion } from './parts/hooks';
import { Pill } from './parts/Pill';
import { VizFrame } from './parts/VizFrame';

export interface ArticleTeaserTrackingProps extends HTMLAttributes<HTMLDivElement> {
  autoplay?: boolean;
  speed?: number;
  /** Start with this step shown in full (the server frame is step 0 otherwise). */
  initialStep?: TeaserStep;
}

const FIRST_DELAY = 800;
const JUMP_DELAY = 250;
const SCROLL_DELAY = 400;

function fade(on: boolean): string {
  return cx('elb-viz-teaser__fade', on && 'elb-viz-teaser__fade--on');
}

function TeaserCard({
  article,
  position,
  seen,
  ahead,
}: {
  article: TeaserArticle;
  position: number;
  seen: ReadonlySet<TeaserEffect>;
  ahead: boolean;
}) {
  return (
    <div
      className={cx(
        'elb-viz-teaser__card',
        seen.has('entity') && 'elb-viz-teaser__card--entity',
        ahead && 'elb-viz-teaser__card--ahead',
      )}
    >
      <span className="elb-viz-teaser__pills">
        <Pill part="entity" className={fade(seen.has('entity'))}>
          {TEASER_ENTITY}
        </Pill>
        <Pill
          part="property"
          variant="outline"
          className={fade(seen.has('position'))}
        >
          {position}
        </Pill>
      </span>
      <PhotoPlaceholder
        tone="viz"
        className={cx('elb-viz-teaser__photo', fade(seen.has('image')))}
      />
      <span
        className={cx(
          'elb-viz-teaser__kicker',
          fade(seen.has('category')),
          seen.has('category') && 'elb-viz-teaser__kicker--on',
        )}
      >
        {article.kicker}
      </span>
      <span
        className={cx(
          'elb-viz-teaser__title',
          fade(seen.has('title')),
          seen.has('title') && 'elb-viz-teaser__title--on',
        )}
      >
        {article.title}
      </span>
      <span
        className={cx(
          'elb-viz-teaser__link',
          fade(seen.has('action')),
          seen.has('action') && 'elb-viz-teaser__link--on',
        )}
      >
        Open →
      </span>
    </div>
  );
}

/**
 * A list and its cards are reached at the list's step. The lead list's first
 * card stands for the teaser the atom and molecule steps tag, so it and its
 * list are reached from step 1. Narrow frames hide what is not reached yet
 * instead of stacking empty boxes.
 */
function TeaserGroup({
  page,
  seen,
  current,
  lead,
}: {
  page: TeaserPage;
  seen: ReadonlySet<TeaserEffect>;
  current: TeaserStep;
  lead: boolean;
}) {
  const globalsOn = seen.has(page.globalsEffect);
  const listOn = seen.has(page.listEffect);
  const reached = page.step <= current;
  return (
    <div
      className={cx(
        'elb-viz-teaser__page',
        globalsOn && 'elb-viz-teaser__page--on',
        !reached && !lead && 'elb-viz-teaser__page--ahead',
      )}
    >
      <span className="elb-viz-teaser__page-pill">
        <Pill
          part="globals"
          className={fade(globalsOn)}
        >{`pagetype:${page.pagetype}`}</Pill>
      </span>
      <div
        className={cx(
          'elb-viz-teaser__list',
          listOn && 'elb-viz-teaser__list--on',
        )}
      >
        <div className={cx('elb-viz-teaser__list-head', fade(listOn))}>
          <span className="elb-viz-teaser__list-label">
            <span className="elb-viz-teaser__list-name">{page.header}</span>
            {page.heading !== undefined && (
              <span className="elb-viz-teaser__list-heading">
                {page.heading}
              </span>
            )}
          </span>
          <Pill part="context">{`list:${page.list}`}</Pill>
        </div>
        <div className="elb-viz-teaser__cards">
          {page.articles.map((article, index) => (
            <TeaserCard
              key={article.title}
              article={article}
              position={index + 1}
              seen={seen}
              ahead={!reached && !(lead && index === 0)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Tagging demo: one ArticleTeaser tagged once, walked through atom, molecule,
 * organisms and pages, showing how every instance inherits entity, action,
 * properties, context and globals. Autoplays while the code is in view; shows
 * the finished walk-through with reduced motion. A clicked step plays from its
 * start and stays there.
 */
export function ArticleTeaserTracking({
  autoplay = true,
  speed = 1,
  initialStep,
  ...rest
}: ArticleTeaserTrackingProps) {
  const codeRef = useRef<HTMLDivElement>(null);
  const inView = useInView(codeRef, 0.35);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(() =>
    initialStep ? teaserStepEnd(initialStep) : 0,
  );
  const [delay, setDelay] = useState<number | null>(FIRST_DELAY);
  // A clicked step: autoplay plays it and ends with it.
  const [pinned, setPinned] = useState<TeaserStep | null>(null);
  const playing = autoplay && inView && !reduced;
  const end = pinned === null ? TEASER_ITEMS.length : teaserStepEnd(pinned);

  useEffect(() => {
    if (reduced) setShown(TEASER_ITEMS.length);
  }, [reduced]);

  useEffect(() => {
    if (!playing || delay === null) return undefined;
    const timer = setTimeout(() => {
      const advance = teaserAdvance(shown);
      if (!advance) {
        setDelay(null);
        return;
      }
      setShown(advance.next);
      setDelay(advance.next < end ? advance.delay : null);
    }, delay / speed);
    return () => clearTimeout(timer);
  }, [playing, delay, shown, speed, end]);

  // Keep the newest line in the middle of the code pane.
  useEffect(() => {
    const pane = codeRef.current;
    if (!pane || shown === 0 || typeof pane.scrollTo !== 'function')
      return undefined;
    const timer = setTimeout(() => {
      const line = pane.querySelector(`[data-line="${shown - 1}"]`);
      const top =
        line instanceof HTMLElement
          ? line.offsetTop - pane.clientHeight / 2
          : 0;
      pane.scrollTo({
        top: Math.max(0, top),
        behavior: reduced ? 'auto' : 'smooth',
      });
    }, SCROLL_DELAY);
    return () => clearTimeout(timer);
  }, [shown, reduced]);

  const jump = (step: TeaserStep) => {
    setPinned(step);
    if (autoplay && !reduced) {
      setShown(teaserStepStart(step));
      setDelay(JUMP_DELAY);
    } else {
      setShown(teaserStepEnd(step));
    }
  };

  const count = Math.min(shown, TEASER_ITEMS.length);
  const visibleStep = count > 0 ? TEASER_ITEMS[count - 1].step : 0;
  const current: TeaserStep = visibleStep === 0 ? 1 : visibleStep;
  const seen = new Set<TeaserEffect>();
  for (const item of TEASER_ITEMS.slice(0, count))
    if (item.kind === 'code' && item.effect) seen.add(item.effect);

  let lineNumber = 0;
  let separated = false;
  const lines = TEASER_ITEMS.map((item, index) => {
    const visible = item.step <= visibleStep;
    const lineClass = cx(
      'elb-viz-teaser__line',
      visible && 'elb-viz-teaser__line--visible',
      visible && item.step < current && 'elb-viz-teaser__line--dim',
      item.kind === 'file' && 'elb-viz-teaser__line--file',
    );
    if (item.kind === 'file') {
      lineNumber = 0;
      const fileClass = cx(
        'elb-viz-teaser__file',
        separated && 'elb-viz-teaser__file--separated',
      );
      separated = true;
      return (
        <div key={index} data-line={index} className={lineClass}>
          <div className={fileClass}>
            <span className="elb-viz-teaser__file-name">{item.name}</span>
            <span className="elb-viz-teaser__file-level">{item.level}</span>
          </div>
        </div>
      );
    }
    lineNumber += 1;
    const reached = index < count;
    const isCurrent = index === count - 1 && item.effect !== undefined;
    return (
      <div key={index} data-line={index} className={lineClass}>
        <CodeLine
          number={lineNumber}
          bar={reached ? item.part : undefined}
          className={cx(
            'elb-viz-teaser__code',
            isCurrent &&
              `elb-viz-teaser__code--current-${item.part ?? 'plain'}`,
          )}
        >
          <CodeTokens tokens={item.tokens} active={reached} />
        </CodeLine>
      </div>
    );
  });

  return (
    <VizFrame {...rest} variant="teaser">
      <div className="elb-viz-teaser">
        <div className="elb-viz-teaser__header">
          <div className="elb-viz-teaser__steps">
            {TEASER_STEPS.map(({ step, label }) => (
              <button
                key={step}
                type="button"
                aria-label={`Step ${step}: ${label}`}
                aria-pressed={step === current}
                className={cx(
                  'elb-viz-teaser__step',
                  step === current && 'elb-viz-teaser__step--active',
                  step < current && 'elb-viz-teaser__step--done',
                )}
                onClick={() => jump(step)}
              >
                <span className="elb-viz-teaser__step-number">{step}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="elb-viz-teaser__legend">
            <EventLegend />
          </div>
        </div>
        <p className="elb-viz-teaser__caption">{TEASER_CAPTIONS[current]}</p>
        <div className="elb-viz-teaser__body">
          <div className="elb-viz-teaser__pane">
            <div ref={codeRef} className="elb-viz-teaser__scroll">
              {lines}
            </div>
          </div>
          <div className="elb-viz-teaser__pages">
            {TEASER_PAGE_IDS.map((id, index) => (
              <TeaserGroup
                key={id}
                page={TEASER_PAGES[id]}
                seen={seen}
                current={current}
                lead={index === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </VizFrame>
  );
}
