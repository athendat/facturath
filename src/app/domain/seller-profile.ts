import { SCHEMA_VERSION, type Invoice, type Party } from './invoice';

/**
 * The seller's own data, stored once and copied into every new invoice. The
 * text fields mirror the seller `Party` minus the identity card, which only
 * buyers carry; the asset ids point at images in the asset store.
 */
export interface SellerProfile {
  schemaVersion: number;
  name: string;
  address: string;
  nit: string;
  commercialRegistry: string;
  bankAccount: string;
  bankBranch: string;
  logoAssetId: string | null;
  transfermovilQrAssetId: string | null;
  enzonaQrAssetId: string | null;
}

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
  return {
    name: profile.name,
    address: profile.address,
    nit: profile.nit,
    identityCard: '',
    commercialRegistry: profile.commercialRegistry,
    bankAccount: profile.bankAccount,
    bankBranch: profile.bankBranch,
  };
}

/** The text fields of `party` over `base`; the asset ids come from `base`. */
export function partyToProfile(party: Party, base: SellerProfile): SellerProfile {
  return {
    ...base,
    name: party.name,
    address: party.address,
    nit: party.nit,
    commercialRegistry: party.commercialRegistry,
    bankAccount: party.bankAccount,
    bankBranch: party.bankBranch,
  };
}

/** A copy of `invoice` whose seller block and asset ids come from `profile`. */
export function applyProfileToInvoice(invoice: Invoice, profile: SellerProfile): Invoice {
  return {
    ...invoice,
    seller: profileToParty(profile),
    logoAssetId: profile.logoAssetId,
    transfermovilQrAssetId: profile.transfermovilQrAssetId,
    enzonaQrAssetId: profile.enzonaQrAssetId,
  };
}
