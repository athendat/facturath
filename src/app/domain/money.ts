/**
 * Money math in integer cents.
 *
 * User input is parsed into an exact scaled decimal (integer mantissa and a
 * power-of-ten scale) so that products such as 3 x 0.1 or 1.005 x 1 round
 * once, half up, without floating-point artifacts.
 */

interface Decimal {
  mantissa: bigint;
  scale: number;
}

const ZERO: Decimal = { mantissa: 0n, scale: 0 };
const DECIMAL_PATTERN = /^(\d*)(?:[.,](\d*))?$/;

/** Parses user text into a scaled decimal. Comma and point are both decimal separators. Empty or invalid input is zero. */
function parseDecimal(text: string): Decimal {
  const match = DECIMAL_PATTERN.exec(text.trim());
  if (!match) {
    return ZERO;
  }
  const integer = match[1] ?? '';
  const fraction = match[2] ?? '';
  if (integer === '' && fraction === '') {
    return ZERO;
  }
  return { mantissa: BigInt(integer + fraction || '0'), scale: fraction.length };
}

/** Integer division rounded half up, for non-negative operands. */
function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

/** Rescales a decimal to an integer with `scale` fraction digits, rounding half up once. */
function toScaledInteger(value: Decimal, scale: number): bigint {
  const shift = scale - value.scale;
  if (shift >= 0) {
    return value.mantissa * 10n ** BigInt(shift);
  }
  return divideRoundHalfUp(value.mantissa, 10n ** BigInt(-shift));
}

function multiply(a: Decimal, b: Decimal): Decimal {
  return { mantissa: a.mantissa * b.mantissa, scale: a.scale + b.scale };
}

function fromCents(cents: number): Decimal {
  return { mantissa: BigInt(cents), scale: 2 };
}

/** Whether the user typed a number greater than zero. */
export function isPositiveNumber(text: string): boolean {
  return parseDecimal(text).mantissa > 0n;
}

/** Parses a plain amount typed by the user into cents, rounding half up once. */
export function parseCents(text: string): number {
  return Number(toScaledInteger(parseDecimal(text), 2));
}

/** Line amount: quantity x unit price, rounded to cents once. */
export function lineAmountCents(quantity: string, unitPrice: string): number {
  return Number(toScaledInteger(multiply(parseDecimal(quantity), parseDecimal(unitPrice)), 2));
}

/** `cents x percent / 100`, rounded to cents once. */
export function percentOfCents(cents: number, percent: string): number {
  const product = multiply(fromCents(cents), parseDecimal(percent));
  return Number(toScaledInteger({ mantissa: product.mantissa, scale: product.scale + 2 }, 2));
}

/** `cents x factor`, rounded to cents once. */
export function multiplyCents(cents: number, factor: string): number {
  return Number(toScaledInteger(multiply(fromCents(cents), parseDecimal(factor)), 2));
}
