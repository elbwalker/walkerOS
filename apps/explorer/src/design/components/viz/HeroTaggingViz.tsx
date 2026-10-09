import React, { useEffect, useRef, useState, type HTMLAttributes } from 'react';
import { cx } from '../cx';
import { HERO_START, heroFrame } from './data/hero';
import { CodeLine, CodeTokens } from './parts/CodeTokens';
import { EventsTable } from './parts/EventsTable';
import { useInView, useReducedMotion } from './parts/hooks';
import { Pill } from './parts/Pill';
import { vizStyle } from './parts/style';
import { Thumb } from './parts/Thumb';
import { VizFrame } from './parts/VizFrame';

export interface HeroTaggingVizProps extends HTMLAttributes<HTMLDivElement> {
  playing?: boolean;
  speed?: number;
  /** The loop time (ms) of the first frame, on the server too. */
  startAt?: number;
}

/** The longest step one animation frame may take, so a hidden tab does not jump. */
const MAX_STEP = 64;

/**
 * Hero demo: walkerOS attributes are typed into an article teaser, the card
 * lights up as each part is tagged, a cursor clicks it, and the events land in
 * a live table. Animates only while visible; still with reduced motion.
 */
export function HeroTaggingViz({
  playing = true,
  speed = 1,
  startAt = HERO_START,
  ...rest
}: HeroTaggingVizProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const inView = useInView(paneRef, 0);
  const reduced = useReducedMotion();
  const [time, setTime] = useState(startAt);
  const animate = playing && inView && !reduced;

  useEffect(() => {
    if (!animate) return undefined;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const elapsed = Math.min(MAX_STEP, now - last);
      last = now;
      setTime((value) => value + elapsed * speed);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animate, speed]);

  const { article, lines, fade, caretOn, card, cursor, rows } = heroFrame(time);
  return (
    <VizFrame {...rest} variant="hero">
      <div className="elb-viz-hero">
        <div ref={paneRef} className="elb-viz-hero__pane">
          <div className="elb-viz-hero__bar">
            <span className="elb-viz-hero__dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="elb-viz-hero__file">ArticleTeaser.html</span>
          </div>
          <div
            className="elb-viz-hero__code"
            style={vizStyle({ '--elb-viz-fade': fade })}
          >
            {lines.map((line) => (
              <CodeLine
                key={line.id}
                number={line.n}
                bar={line.on ? 'entity' : undefined}
                className={cx(
                  'elb-viz-hero__line',
                  line.on && 'elb-viz-hero__line--on',
                )}
              >
                {line.caret === null ? (
                  <CodeTokens tokens={line.tokens} />
                ) : (
                  <>
                    <CodeTokens tokens={line.tokens.slice(0, line.caret)} />
                    <span
                      className="elb-viz-caret"
                      style={vizStyle({ '--elb-viz-caret': caretOn ? 1 : 0 })}
                    />
                    <CodeTokens tokens={line.tokens.slice(line.caret)} />
                  </>
                )}
              </CodeLine>
            ))}
          </div>
          <div className="elb-viz-hero__stage">
            <div
              className={cx(
                'elb-viz-hero__card',
                card.entity && 'elb-viz-hero__card--tagged',
              )}
              style={vizStyle({
                '--elb-viz-card-opacity': card.opacity,
                '--elb-viz-card-offset': card.offset,
              })}
            >
              <div className="elb-viz-hero__pills">
                {card.entity && <Pill part="entity">article</Pill>}
                {card.impression && <Pill part="action">impression</Pill>}
              </div>
              <div className="elb-viz-hero__thumb">
                <Thumb kind={article.thumb} />
              </div>
              <div className="elb-viz-hero__text">
                <span
                  className={cx(
                    'elb-viz-hero__kicker',
                    card.category && 'elb-viz-hero__kicker--on',
                  )}
                >
                  {article.kicker}
                </span>
                <span className="elb-viz-hero__title">
                  <span
                    className={cx(
                      'elb-viz-hero__mark',
                      card.title && 'elb-viz-hero__mark--on',
                    )}
                  >
                    {article.title}
                  </span>
                </span>
                <div className="elb-viz-hero__foot">
                  <span
                    className={cx(
                      'elb-viz-hero__link',
                      card.action && 'elb-viz-hero__link--on',
                    )}
                  >
                    Open →
                    <span
                      className="elb-viz-hero__cursor"
                      aria-hidden="true"
                      style={vizStyle({
                        '--elb-viz-cursor-x': cursor.x,
                        '--elb-viz-cursor-y': cursor.y,
                        '--elb-viz-cursor-opacity': cursor.opacity,
                        '--elb-viz-ring-scale': cursor.ring,
                        '--elb-viz-ring-opacity': cursor.ringOpacity,
                        '--elb-viz-press': cursor.pressed ? 0.8 : 1,
                      })}
                    >
                      <span className="elb-viz-hero__ring" />
                      <span className="elb-viz-hero__pointer" />
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <EventsTable rows={rows} />
      </div>
    </VizFrame>
  );
}
