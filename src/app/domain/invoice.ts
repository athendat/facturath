/** Invoice model. Numeric fields hold the raw text the user typed; the domain parses on demand. */

export const CURRENCIES = ['CUP', 'MLC', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const SCHEMA_VERSION = 1;

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

/** An exchange rate to CUP is only meaningful when the invoice is in another currency. */
export function needsExchangeRate(currency: Currency): boolean {
  return currency !== 'CUP';
}

export interface LineItem {
  code: string;
  description: string;
  detail: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

/** Which side of the operation a `Party` block describes. */
export type PartyRole = 'seller' | 'buyer';

export interface Party {
  name: string;
  address: string;
  nit: string;
  identityCard: string;
  commercialRegistry: string;
  bankAccount: string;
  bankBranch: string;
}

export interface Carrier {
  name: string;
  identityCard: string;
  plate: string;
  waybill: string;
  railwayBox: string;
}

export interface Signatures {
  delivers: string;
  receives: string;
  carrier: string;
  books: string;
}

export interface Tax {
  name: string;
  percent: string;
}

/** Ids of the images in the asset store; null when the invoice has none. */
export interface AssetIds {
  logoAssetId: string | null;
  transfermovilQrAssetId: string | null;
  enzonaQrAssetId: string | null;
}

/**
 * The images a seller uploads once and sees on every invoice, each mapped to
 * the field that holds its asset id. The single place a new image is added.
 */
export const IMAGE_ASSET_FIELDS = {
  logo: 'logoAssetId',
  transfermovilQr: 'transfermovilQrAssetId',
  enzonaQr: 'enzonaQrAssetId',
} as const satisfies Record<string, keyof AssetIds>;

export type ImageKind = keyof typeof IMAGE_ASSET_FIELDS;

export const IMAGE_KINDS = Object.keys(IMAGE_ASSET_FIELDS) as readonly ImageKind[];

/** The asset id fields, in image order. */
export const ASSET_ID_FIELDS = Object.values(IMAGE_ASSET_FIELDS) as readonly (keyof AssetIds)[];

export interface Invoice extends AssetIds {
  id: string;
  schemaVersion: number;
  series: string;
  number: string;
  issueDate: string;
  currency: Currency;
  exchangeRate: string;
  concept: string;
  seller: Party;
  buyer: Party;
  lines: LineItem[];
  discount: string;
  shipping: string;
  tax: Tax;
  notes: string;
  terms: string;
  carrier: Carrier;
  signatures: Signatures;
}

export function createEmptyLine(): LineItem {
  return { code: '', description: '', detail: '', unit: 'u', quantity: '1', unitPrice: '' };
}

export function createEmptyParty(): Party {
  return {
    name: '',
    address: '',
    nit: '',
    identityCard: '',
    commercialRegistry: '',
    bankAccount: '',
    bankBranch: '',
  };
}

export function createInvoice(id: string): Invoice {
  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    series: 'A',
    number: '0001',
    issueDate: '',
    currency: 'CUP',
    exchangeRate: '',
    concept: '',
    seller: createEmptyParty(),
    buyer: createEmptyParty(),
    lines: [createEmptyLine()],
    discount: '',
    shipping: '',
    tax: { name: '', percent: '' },
    notes: '',
    terms: '',
    carrier: { name: '', identityCard: '', plate: '', waybill: '', railwayBox: '' },
    signatures: { delivers: '', receives: '', carrier: '', books: '' },
    logoAssetId: null,
    transfermovilQrAssetId: null,
    enzonaQrAssetId: null,
  };
}
