/**
 * A small token file in the artifact grammar that exercises every generator
 * branch: themed and single colours, a single alias of a themed colour, a
 * per-theme alias, an invariant rgba(), a single alias of a single literal,
 * a themed and an invariant shadow, spacing, radius, container, zIndex,
 * motion, two families and a style with its own family. A fresh object per call, typed loosely enough
 * for the guard tests to break it.
 */
export interface FixtureTokens {
  name: string;
  version: number;
  meta?: unknown;
  extra?: unknown;
  color: {
    themes: { id: string; name: string }[];
    tokens: {
      name: string;
      value: string | { dark?: string; light?: string };
      usage: string;
    }[];
  };
  type: {
    fonts: unknown[];
    families: Record<string, string>;
    groups: {
      name: string;
      family: string;
      styles: {
        name: string;
        family?: string;
        fontSize: string;
        lineHeight: number | string;
        fontWeight: number;
        letterSpacing?: string;
        usage: string;
      }[];
    }[];
  };
  spacing: { tokens: { name: string; value: string; usage: string }[] };
  radius: { tokens: { name: string; value: string; usage: string }[] };
  container: { tokens: { name: string; value: string; usage: string }[] };
  shadow: {
    tokens: {
      name: string;
      value: string | { dark: string; light: string };
      usage: string;
    }[];
  };
  zIndex: { tokens: { name: string; value: string; usage: string }[] };
  motion: { tokens: { name: string; value: string; usage: string }[] };
}

export function fixture(): FixtureTokens {
  return {
    name: 'Fixture',
    version: 1,
    color: {
      themes: [
        { id: 'dark', name: 'Dark' },
        { id: 'light', name: 'Light' },
      ],
      tokens: [
        {
          name: 'bg',
          value: { dark: '#111827', light: '#ffffff' },
          usage: 'Page ground.',
        },
        { name: 'primary', value: '#01b5e2', usage: 'Brand fill.' },
        {
          name: 'link',
          value: { dark: '#4fb3e0', light: '#0076a0' },
          usage: 'Links.',
        },
        {
          name: 'info',
          value: '{link}',
          usage: 'A single alias of a themed colour.',
        },
        {
          name: 'focus',
          value: { dark: '{primary}', light: '{link}' },
          usage: 'A per-theme alias.',
        },
        {
          name: 'code-bg',
          value: 'rgba(41, 45, 62, 1)',
          usage: 'An invariant rgba() colour.',
        },
        {
          name: 'accent',
          value: '{primary}',
          usage: 'A single alias of a single literal.',
        },
      ],
    },
    type: {
      fonts: [],
      families: {
        sans: "system-ui, 'Segoe UI', sans-serif",
        mono: 'ui-monospace, monospace',
      },
      groups: [
        {
          name: 'Text',
          family: 'sans',
          styles: [
            {
              name: 'body',
              fontSize: '16px',
              lineHeight: 1.65,
              fontWeight: 400,
              usage: 'Body.',
            },
            {
              name: 'eyebrow',
              fontSize: '13px',
              lineHeight: 1.5,
              fontWeight: 600,
              letterSpacing: '0.12em',
              usage: 'Eyebrow.',
            },
            {
              name: 'code',
              family: 'mono',
              fontSize: '0.88em',
              lineHeight: 1.5,
              fontWeight: 400,
              usage: 'Its own family.',
            },
          ],
        },
      ],
    },
    spacing: {
      tokens: [{ name: 'gutter', value: '24px', usage: 'Side padding.' }],
    },
    radius: {
      tokens: [{ name: 'radius-md', value: '8px', usage: 'Buttons.' }],
    },
    container: {
      tokens: [
        { name: 'container-md', value: '448px', usage: 'Dialog width.' },
      ],
    },
    shadow: {
      tokens: [
        {
          name: 'ring',
          value: {
            dark: '0 0 0 4px rgba(1, 181, 226, 0.16)',
            light: '0 0 0 4px rgba(1, 181, 226, 0.14)',
          },
          usage: 'Highlight ring.',
        },
        {
          name: 'edge',
          value: '0 0 0 1px rgba(0, 0, 0, 0.2)',
          usage: 'An invariant shadow.',
        },
      ],
    },
    zIndex: { tokens: [{ name: 'z-modal', value: '50', usage: 'Dialogs.' }] },
    motion: {
      tokens: [
        { name: 'motion', value: '180ms', usage: 'Duration.' },
        { name: 'ease', value: 'cubic-bezier(0.2, 0, 0, 1)', usage: 'Easing.' },
      ],
    },
  };
}
