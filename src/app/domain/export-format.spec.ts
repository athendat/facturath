import { migrateExportFile, validateExportFile } from './export-format';
import v1Backup from './fixtures/export-v1-backup.json';
import v1Invoice from './fixtures/export-v1-invoice.json';
import { SCHEMA_VERSION, createInvoice } from './invoice';
import { createDefaultPreferences } from './preferences';
import { createEmptyProfile } from './seller-profile';

/** One exported file of each kind per schema version ever released; a new version adds a row. */
const FIXTURES: Record<number, { invoice: unknown; backup: unknown }> = {
  1: { invoice: v1Invoice, backup: v1Backup },
};

const versions = Array.from({ length: SCHEMA_VERSION }, (_, index) => index + 1);

/** The export fixture of `version` and `kind`, as JSON.parse would hand it to an importer. */
function fixture(version: number, kind: 'invoice' | 'backup'): unknown {
  const entry = FIXTURES[version];
  if (!entry) {
    throw new Error(`No export fixtures for schema version ${version}`);
  }
  return JSON.parse(JSON.stringify(entry[kind]));
}

describe('export format', () => {
  describe('validateExportFile', () => {
    it('accepts a current invoice file and a current backup file', () => {
      const invoice = {
        format: 'facturath',
        kind: 'invoice',
        schemaVersion: SCHEMA_VERSION,
        invoice: createInvoice('a'),
        assets: {},
      };
      const backup = {
        format: 'facturath',
        kind: 'backup',
        schemaVersion: SCHEMA_VERSION,
        invoices: [createInvoice('a')],
        profile: createEmptyProfile(),
        preferences: createDefaultPreferences(),
        assets: { 'id-1': { type: 'image/png', data: 'AAAA' } },
      };

      expect(validateExportFile(invoice)).toEqual(invoice);
      expect(validateExportFile(backup)).toEqual(backup);
    });

    it.each([
      ['a non-object', 'texto'],
      ['another format', { format: 'other', kind: 'invoice', schemaVersion: 1, invoice: createInvoice('a'), assets: {} }],
      ['an unknown kind', { format: 'facturath', kind: 'note', schemaVersion: 1, invoice: createInvoice('a'), assets: {} }],
      ['a version newer than the app', { format: 'facturath', kind: 'invoice', schemaVersion: SCHEMA_VERSION + 1, invoice: createInvoice('a'), assets: {} }],
      ['a fractional version', { format: 'facturath', kind: 'invoice', schemaVersion: 1.5, invoice: createInvoice('a'), assets: {} }],
      ['a version below 1', { format: 'facturath', kind: 'invoice', schemaVersion: 0, invoice: createInvoice('a'), assets: {} }],
      ['an invoice missing its lines', { format: 'facturath', kind: 'invoice', schemaVersion: 1, invoice: { ...createInvoice('a'), lines: undefined }, assets: {} }],
      ['an invoice with an unknown currency', { format: 'facturath', kind: 'invoice', schemaVersion: 1, invoice: { ...createInvoice('a'), currency: 'GBP' }, assets: {} }],
      ['an asset without base64 data', { format: 'facturath', kind: 'invoice', schemaVersion: 1, invoice: createInvoice('a'), assets: { x: { type: 'image/png' } } }],
      ['a backup without a profile', { format: 'facturath', kind: 'backup', schemaVersion: 1, invoices: [], preferences: createDefaultPreferences(), assets: {} }],
    ])('rejects %s', (_, value) => {
      expect(validateExportFile(value)).toBeNull();
    });

    it('tolerates extra fields', () => {
      const file = {
        format: 'facturath',
        kind: 'invoice',
        schemaVersion: SCHEMA_VERSION,
        invoice: { ...createInvoice('a'), extra: true },
        assets: {},
        exportedAt: '2026-09-19',
      };

      expect(validateExportFile(file)).not.toBeNull();
    });
  });

  describe('migrateExportFile', () => {
    it.each(versions)('upgrades the v%i invoice fixture to the current schema', (version) => {
      const file = validateExportFile(fixture(version, 'invoice'));
      expect(file).not.toBeNull();

      const migrated = migrateExportFile(file!);

      expect(migrated.kind).toBe('invoice');
      expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
      if (migrated.kind === 'invoice') {
        expect(migrated.invoice.schemaVersion).toBe(SCHEMA_VERSION);
        expect(Object.keys(migrated.invoice).sort()).toEqual(Object.keys(createInvoice('a')).sort());
        expect(migrated.invoice.logoAssetId).toBe('7d8a1c2e-1111-4a5b-8c6d-000000000001');
        expect(migrated.assets['7d8a1c2e-1111-4a5b-8c6d-000000000001']?.type).toBe('image/png');
      }
    });

    it.each(versions)('upgrades the v%i backup fixture to the current schema', (version) => {
      const file = validateExportFile(fixture(version, 'backup'));
      expect(file).not.toBeNull();

      const migrated = migrateExportFile(file!);

      expect(migrated.kind).toBe('backup');
      expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
      if (migrated.kind === 'backup') {
        expect(migrated.invoices).toHaveLength(2);
        for (const invoice of migrated.invoices) {
          expect(invoice.schemaVersion).toBe(SCHEMA_VERSION);
          expect(Object.keys(invoice).sort()).toEqual(Object.keys(createInvoice('a')).sort());
        }
        expect(Object.keys(migrated.profile).sort()).toEqual(Object.keys(createEmptyProfile()).sort());
        expect(Object.keys(migrated.preferences).sort()).toEqual(
          Object.keys(createDefaultPreferences()).sort(),
        );
        expect(migrated.profile.name).toBe('Taller Rodríguez');
      }
    });
  });
});
