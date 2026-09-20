import { contrastRatio, parseColor, relativeLuminance } from './contrast';

describe('parseColor', () => {
  it('reads a six-digit hex colour', () => {
    expect(parseColor('#3A0CA3')).toEqual({ r: 58, g: 12, b: 163, a: 1 });
  });

  it('reads a three-digit hex colour', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('reads an rgb() colour', () => {
    expect(parseColor('rgb(17, 24, 39)')).toEqual({ r: 17, g: 24, b: 39, a: 1 });
  });

  it('reads an rgba() colour with its alpha', () => {
    expect(parseColor('rgba(58,12,163,.25)')).toEqual({ r: 58, g: 12, b: 163, a: 0.25 });
  });

  it('rejects a colour it cannot read', () => {
    expect(() => parseColor('hotpink')).toThrow();
  });
});

describe('relativeLuminance', () => {
  // WCAG 2.1 relative luminance: white is 1, black is 0.
  it('is 1 for white and 0 for black', () => {
    expect(relativeLuminance(parseColor('#FFFFFF'))).toBeCloseTo(1, 5);
    expect(relativeLuminance(parseColor('#000000'))).toBeCloseTo(0, 5);
  });

  it('is 0.2158 for mid grey #808080', () => {
    expect(relativeLuminance(parseColor('#808080'))).toBeCloseTo(0.2159, 4);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio('#3A0CA3', '#3A0CA3')).toBeCloseTo(1, 5);
  });

  // The canonical WCAG boundary grey: #767676 is the darkest grey that still passes 4.5:1 on white.
  it('is 4.54 for #767676 on white', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#FFFFFF', '#3A0CA3')).toBeCloseTo(contrastRatio('#3A0CA3', '#FFFFFF'), 5);
  });

  it('composites a translucent foreground over the background before measuring', () => {
    // 50% black over white paints exactly rgb(127.5, 127.5, 127.5).
    expect(contrastRatio('rgba(0,0,0,.5)', '#FFFFFF')).toBeCloseTo(
      contrastRatio('rgb(127.5, 127.5, 127.5)', '#FFFFFF'),
      5,
    );
  });
});
