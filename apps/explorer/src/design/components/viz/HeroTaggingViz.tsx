import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import { HERO_LOOP, HERO_START, heroLoopScript } from './data/hero';
import { useInView, useReducedMotion } from './parts/hooks';
import { TaggingViz } from './TaggingViz';

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
 * a live table, one article per loop. Animates only while visible; still with
 * reduced motion.
 */
export function HeroTaggingViz({
  playing = true,
  speed = 1,
  startAt = HERO_START,
  ...rest
}: HeroTaggingVizProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, 0);
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

  const loop = Math.floor(time / HERO_LOOP);
  const script = useMemo(() => heroLoopScript(loop), [loop]);
  return (
    <TaggingViz
      {...rest}
      ref={rootRef}
      script={script}
      t={time - loop * HERO_LOOP}
    />
  );
}
