import {
  ASSET_ID_FIELDS,
  SCHEMA_VERSION,
  isCurrency,
  type Carrier,
  type Invoice,
  type LineItem,
  type Party,
  type Signatures,
  type Tax,
} from './invoice';
import { DENSITIES, SECTION_FLAGS, type Preferences } from './preferences';
import { PROFILE_TEXT_FIELDS, type SellerProfile } from './seller-profile';

/**
 * The JSON files the seller moves between devices. Both kinds carry the
 * schema version they were written with and the images they reference,
 * inlined as base64 (stored records never embed images). A file from an
 * older version is upgraded by `migrateExportFile`; one from a newer version
 * is rejected by `validateExportFile`.
 */

export const EXPORT_FORMAT = 'facturath';

/** One inlined image: its MIME type and its bytes as base64. */
export interface ExportedAsset {
  type: string;
  data: string;
}

/** Inlined images keyed by their asset id; the ids are kept on import. */
export type ExportedAssets = Record<string, ExportedAsset>;

export interface InvoiceExportFile {
  format: typeof EXPORT_FORMAT;
  kind: 'invoice';
  schemaVersion: number;
  invoice: Invoice;
  /** Only the images the invoice references. */
  assets: ExportedAssets;
}

export interface BackupExportFile {
  format: typeof EXPORT_FORMAT;
  kind: 'backup';
  schemaVersion: number;
  invoices: Invoice[];
  profile: SellerProfile;
  preferences: Preferences;
  assets: ExportedAssets;
}

export type ExportFile = InvoiceExportFile | BackupExportFile;

export function invoiceExportFileName(invoice: Pick<Invoice, 'series' | 'number'>): string {
  return `factura-${invoice.series}-${invoice.number}.json`;
}

/** `isoDate` is the export day as `YYYY-MM-DD` (see `formatLocalIsoDate`). */
export function backupExportFileName(isoDate: string): string {
  return `facturath-copia-${isoDate}.json`;
}

/**
 * Upgrades a file of any released schema version to `SCHEMA_VERSION`. Entry `n`
 * takes a file at version `n + 1` to version `n + 2`, so the table always holds
 * `SCHEMA_VERSION - 1` steps and a new version adds exactly one.
 */
const MIGRATIONS: readonly ((file: ExportFile) => ExportFile)[] = [];

export function migrateExportFile(file: ExportFile): ExportFile {
  let current = file;
  for (let version = file.schemaVersion; version < SCHEMA_VERSION; version++) {
    const step = MIGRATIONS[version - 1];
    if (!step) {
      throw new Error(`No migration from export schema version ${version}`);
    }
    current = step(current);
  }
  return { ...current, schemaVersion: SCHEMA_VERSION };
}

/**
 * The file `value` describes, or null when it is not a FACTURATH export the app
 * can read: wrong format, unknown kind, a schema version outside 1..current, or
 * a record missing a required field. Extra fields are kept as they are.
 */
export function validateExportFile(value: unknown): ExportFile | null {
  if (!isRecord(value) || value['format'] !== EXPORT_FORMAT) {
    return null;
  }
  const schemaVersion = value['schemaVersion'];
  if (
    typeof schemaVersion !== 'number' ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1 ||
    schemaVersion > SCHEMA_VERSION
  ) {
    return null;
  }
  const assets = value['assets'];
  if (!isRecord(assets) || !Object.values(assets).every(isExportedAsset)) {
    return null;
  }
  if (value['kind'] === 'invoice') {
    return isInvoice(value['invoice']) ? (value as unknown as InvoiceExportFile) : null;
  }
  if (value['kind'] === 'backup') {
    const { invoices, profile, preferences } = value;
    return Array.isArray(invoices) &&
      invoices.every(isInvoice) &&
      isSellerProfile(profile) &&
      isPreferences(preferences)
      ? (value as unknown as BackupExportFile)
      : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isExportedAsset(value: unknown): value is ExportedAsset {
  return isRecord(value) && typeof value['type'] === 'string' && typeof value['data'] === 'string';
}

/** Whether `value` is an object whose `fields` are all strings. */
function hasStrings(value: unknown, fields: readonly string[]): value is Record<string, string> {
  return isRecord(value) && fields.every((field) => typeof value[field] === 'string');
}

const INVOICE_TEXT_FIELDS = [
  'id',
  'series',
  'number',
  'issueDate',
  'exchangeRate',
  'concept',
  'discount',
  'shipping',
  'notes',
  'terms',
] as const satisfies readonly (keyof Invoice)[];

const PARTY_FIELDS = [
  'name',
  'address',
  'nit',
  'identityCard',
  'commercialRegistry',
  'bankAccount',
  'bankBranch',
] as const satisfies readonly (keyof Party)[];

const LINE_FIELDS = [
  'code',
  'description',
  'detail',
  'unit',
  'quantity',
  'unitPrice',
] as const satisfies readonly (keyof LineItem)[];

const CARRIER_FIELDS = [
  'name',
  'identityCard',
  'plate',
  'waybill',
  'railwayBox',
] as const satisfies readonly (keyof Carrier)[];

const SIGNATURE_FIELDS = ['delivers', 'receives', 'carrier', 'books'] as const satisfies readonly (keyof Signatures)[];

const TAX_FIELDS = ['name', 'percent'] as const satisfies readonly (keyof Tax)[];

function hasAssetIds(value: Record<string, unknown>): boolean {
  return ASSET_ID_FIELDS.every((field) => value[field] === null || typeof value[field] === 'string');
}

function isInvoice(value: unknown): value is Invoice {
  if (!hasStrings(value, INVOICE_TEXT_FIELDS)) {
    return false;
  }
  const record: Record<string, unknown> = value;
  const currency = record['currency'];
  const lines = record['lines'];
  return (
    typeof record['schemaVersion'] === 'number' &&
    typeof currency === 'string' &&
    isCurrency(currency) &&
    hasStrings(record['seller'], PARTY_FIELDS) &&
    hasStrings(record['buyer'], PARTY_FIELDS) &&
    Array.isArray(lines) &&
    lines.every((line) => hasStrings(line, LINE_FIELDS)) &&
    hasStrings(record['tax'], TAX_FIELDS) &&
    hasStrings(record['carrier'], CARRIER_FIELDS) &&
    hasStrings(record['signatures'], SIGNATURE_FIELDS) &&
    hasAssetIds(record)
  );
}

function isSellerProfile(value: unknown): value is SellerProfile {
  return hasStrings(value, PROFILE_TEXT_FIELDS) && hasAssetIds(value);
}

function isPreferences(value: unknown): value is Preferences {
  if (!isRecord(value)) {
    return false;
  }
  const density = value['density'];
  return (
    typeof density === 'string' &&
    (DENSITIES as readonly string[]).includes(density) &&
    SECTION_FLAGS.every((flag) => typeof value[flag] === 'boolean')
  );
}
