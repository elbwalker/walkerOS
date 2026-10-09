import { useEffect, useState, type RefObject } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * True while at least `threshold` of the element is visible, and always true
 * where IntersectionObserver is missing. False on the server and in the first
 * client frame, so a demo's server HTML never depends on it.
 */
export function useInView(
  ref: RefObject<Element | null>,
  threshold: number,
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    // isIntersecting turns true at the first visible pixel; the ratio holds
    // it to the threshold. The newest entry is the element's current state.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry)
          setInView(
            entry.isIntersecting && entry.intersectionRatio >= threshold,
          );
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return inView;
}

/** The visitor's reduced-motion preference; false on the server and in the first client frame. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(REDUCED_MOTION);
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}
