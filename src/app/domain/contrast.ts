/**
 * WCAG 2.1 contrast maths (1.4.3 text, 1.4.11 non-text). Pure: it takes CSS
 * colour strings and returns numbers, so the accessibility suite can assert the
 * real token values instead of eyeballing them.
 */

/** A colour with straight (non-premultiplied) alpha; channels are 0-255, alpha 0-1. */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const HEX_6 = /^#([0-9a-f]{6})$/i;
const HEX_3 = /^#([0-9a-f]{3})$/i;
const RGB = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/i;

/** Reads `#rgb`, `#rrggbb`, `rgb(r,g,b)` and `rgba(r,g,b,a)`. Anything else throws. */
export function parseColor(value: string): Rgba {
  const text = value.trim();

  const six = HEX_6.exec(text);
  if (six) {
    const digits = six[1];
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }

  const three = HEX_3.exec(text);
  if (three) {
    const digits = three[1];
    return {
      r: Number.parseInt(digits[0].repeat(2), 16),
      g: Number.parseInt(digits[1].repeat(2), 16),
      b: Number.parseInt(digits[2].repeat(2), 16),
      a: 1,
    };
  }

  const rgb = RGB.exec(text);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }

  throw new Error(`Unsupported colour: ${value}`);
}

/** Paints `foreground` over an opaque `background` (simple alpha compositing). */
export function composite(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground.a;
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
    a: 1,
  };
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance: 0 for black, 1 for white. Alpha is ignored. */
export function relativeLuminance(color: Rgba): number {
  return (
    0.2126 * channelLuminance(color.r) +
    0.7152 * channelLuminance(color.g) +
    0.0722 * channelLuminance(color.b)
  );
}

/**
 * Contrast ratio between two CSS colours, from 1 to 21. A translucent
 * foreground is composited over the background first, which is what a browser
 * paints and therefore what a user sees.
 */
export function contrastRatio(foreground: string, background: string): number {
  const back = parseColor(background);
  const front = composite(parseColor(foreground), back);
  const lighter = Math.max(relativeLuminance(front), relativeLuminance(back));
  const darker = Math.min(relativeLuminance(front), relativeLuminance(back));
  return (lighter + 0.05) / (darker + 0.05);
}
