import {
  parseColor,
  resolveColor,
  type DesignTokens,
  type Rgba,
  type ThemeId,
} from '../tokens';

export type Vision = 'normal' | 'protan' | 'deutan';

type Row = readonly [number, number, number];

/** Machado, Oliveira and Fernandes (2009), severity 1.0, applied to linear sRGB. */
const CVD: Record<Exclude<Vision, 'normal'>, readonly [Row, Row, Row]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

const linear = (channel: number): number => {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export function tokenColor(
  tokens: DesignTokens,
  name: string,
  theme: ThemeId,
): Rgba {
  const value = resolveColor(tokens, name, theme);
  const color = parseColor(value);
  if (color === undefined)
    throw new Error(
      `${name} (${theme}) resolves to "${value}", not a literal colour`,
    );
  return color;
}

/** A translucent fill laid over an opaque ground. */
export function over(top: Rgba, ground: Rgba): Rgba {
  if (ground.a < 1)
    throw new Error('the ground under a translucent fill must be opaque');
  const mix = (a: number, b: number): number => a * top.a + b * (1 - top.a);
  return {
    r: mix(top.r, ground.r),
    g: mix(top.g, ground.g),
    b: mix(top.b, ground.b),
    a: 1,
  };
}

export function luminance(color: Rgba): number {
  return (
    0.2126 * linear(color.r) +
    0.7152 * linear(color.g) +
    0.0722 * linear(color.b)
  );
}

/** WCAG 2.x contrast ratio. Refuses translucent colours: composite them with over() first. */
export function contrast(a: Rgba, b: Rgba): number {
  if (a.a < 1 || b.a < 1)
    throw new Error(
      'contrast() needs opaque colours; composite with over() first',
    );
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function oklab(
  color: Rgba,
  vision: Vision = 'normal',
): readonly [number, number, number] {
  const rgb: Row = [linear(color.r), linear(color.g), linear(color.b)];
  const [r, g, b] =
    vision === 'normal'
      ? rgb
      : CVD[vision].map((row) =>
          Math.min(
            1,
            Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]),
          ),
        );
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function deltaE(a: Rgba, b: Rgba, vision: Vision = 'normal'): number {
  const [l1, a1, b1] = oklab(a, vision);
  const [l2, a2, b2] = oklab(b, vision);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
