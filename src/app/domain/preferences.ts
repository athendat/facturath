import { SCHEMA_VERSION } from './invoice';

/** How much room the document leaves around and between its blocks. */
export const DENSITIES = ['compact', 'spacious'] as const;

export type Density = (typeof DENSITIES)[number];

/** The optional document sections the seller can hide. */
export const SECTION_FLAGS = ['showCarrier', 'showSignatures', 'showPaymentQr'] as const;

export type SectionFlag = (typeof SECTION_FLAGS)[number];

/** Layout choices that apply to every invoice on screen and on paper. */
export interface Preferences extends Record<SectionFlag, boolean> {
  schemaVersion: number;
  density: Density;
}

export function isDensity(value: string): value is Density {
  return (DENSITIES as readonly string[]).includes(value);
}

/** Spacious with every section shown: the layout the app has always had. */
export function createDefaultPreferences(): Preferences {
  return {
    schemaVersion: SCHEMA_VERSION,
    density: 'spacious',
    showCarrier: true,
    showSignatures: true,
    showPaymentQr: true,
  };
}
