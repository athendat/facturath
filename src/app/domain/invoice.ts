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

export interface Invoice {
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
  logoAssetId: string | null;
  transfermovilQrAssetId: string | null;
  enzonaQrAssetId: string | null;
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
