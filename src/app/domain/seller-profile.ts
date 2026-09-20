import {
  ASSET_ID_FIELDS,
  SCHEMA_VERSION,
  type AssetIds,
  type Invoice,
  type Party,
} from './invoice';

/** The text fields a seller `Party` and the profile have in common. */
export const PROFILE_TEXT_FIELDS = [
  'name',
  'address',
  'nit',
  'commercialRegistry',
  'bankAccount',
  'bankBranch',
] as const;

export type ProfileTextField = (typeof PROFILE_TEXT_FIELDS)[number];

/**
 * The seller's own data, stored once and copied into every new invoice: the
 * seller `Party` minus the identity card, which only buyers carry, plus the
 * ids of the images in the asset store.
 */
export interface SellerProfile extends Pick<Party, ProfileTextField>, AssetIds {
  schemaVersion: number;
}

export function isProfileTextField(field: keyof Party): field is ProfileTextField {
  return (PROFILE_TEXT_FIELDS as readonly string[]).includes(field);
}

export function createEmptyProfile(): SellerProfile {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: '',
    address: '',
    nit: '',
    commercialRegistry: '',
    bankAccount: '',
    bankBranch: '',
    logoAssetId: null,
    transfermovilQrAssetId: null,
    enzonaQrAssetId: null,
  };
}

export function profileToParty(profile: SellerProfile): Party {
  return { ...pick(profile, PROFILE_TEXT_FIELDS), identityCard: '' };
}

/** A copy of `invoice` whose seller text fields and asset ids come from `profile`; the rest is kept. */
export function applyProfileToInvoice(invoice: Invoice, profile: SellerProfile): Invoice {
  return {
    ...invoice,
    ...pick(profile, ASSET_ID_FIELDS),
    seller: { ...invoice.seller, ...pick(profile, PROFILE_TEXT_FIELDS) },
  };
}

/** Whether `invoice` already points at the same images as `profile`. */
export function hasSameAssetIds(invoice: AssetIds, profile: AssetIds): boolean {
  return ASSET_ID_FIELDS.every((field) => invoice[field] === profile[field]);
}

/** Whether `invoice` already carries the seller text fields and the images of `profile`. */
export function matchesProfile(invoice: Invoice, profile: SellerProfile): boolean {
  return (
    hasSameAssetIds(invoice, profile) &&
    PROFILE_TEXT_FIELDS.every((field) => invoice.seller[field] === profile[field])
  );
}

/** A copy of `invoice` pointing at the images of `profile`; everything else is kept. */
export function applyAssetIdsToInvoice(invoice: Invoice, profile: AssetIds): Invoice {
  return { ...invoice, ...pick(profile, ASSET_ID_FIELDS) };
}

function pick<T, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const picked = {} as Pick<T, K>;
  for (const key of keys) {
    picked[key] = source[key];
  }
  return picked;
}
