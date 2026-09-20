import { TestBed } from '@angular/core/testing';
import { FileDownload } from '../../core/file-download';
import { ObjectUrls } from '../../core/object-urls';
import { InMemoryAssetStore } from '../../core/storage/in-memory-asset-store';
import { InMemoryInvoiceRepository } from '../../core/storage/in-memory-invoice-repository';
import { SettingsStore } from '../../core/settings-store';
import { ASSET_STORE, INVOICE_REPOSITORY, PREFERENCES_STORE } from '../../core/storage/ports';
import { FakeFileDownload } from '../../core/testing/fake-file-download';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
import type { BackupExportFile } from '../../domain/export-format';
import { SCHEMA_VERSION, createInvoice, type Invoice } from '../../domain/invoice';
import { createDefaultPreferences } from '../../domain/preferences';
import { createEmptyProfile } from '../../domain/seller-profile';
import { ImportExportStore } from './import-export-store';

/** A 1x1 PNG, the smallest real image: its bytes must survive the base64 round trip untouched. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PNG_BYTES = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));
const png = new Blob([PNG_BYTES], { type: 'image/png' });

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    ...createInvoice(crypto.randomUUID()),
    issueDate: '2026-09-10',
    concept: 'Venta de mercancías',
    ...overrides,
  };
}

describe('ImportExportStore', () => {
  let store: ImportExportStore;
  let assets: InMemoryAssetStore;
  let repository: InMemoryInvoiceRepository;
  let download: FakeFileDownload;
  let settings: SettingsStore;

  beforeEach(() => {
    assets = new InMemoryAssetStore();
    repository = new InMemoryInvoiceRepository();
    download = new FakeFileDownload();
    TestBed.configureTestingModule({
      providers: [
        { provide: ASSET_STORE, useValue: assets },
        { provide: INVOICE_REPOSITORY, useValue: repository },
        { provide: FileDownload, useValue: download },
        { provide: ObjectUrls, useValue: new FakeObjectUrls() },
      ],
    });
    store = TestBed.inject(ImportExportStore);
    settings = TestBed.inject(SettingsStore);
  });

  describe('exportInvoice', () => {
    it('writes one JSON file named after the invoice with only the images it references', async () => {
      await assets.put('logo-1', png);
      await assets.put('qr-9', new Blob(['other'], { type: 'image/jpeg' }));
      const open = invoice({ series: 'B', number: '0042', logoAssetId: 'logo-1' });

      await store.exportInvoice(open);

      expect(download.saved).toHaveLength(1);
      expect(download.saved[0]?.name).toBe('factura-B-0042.json');
      expect(download.saved[0]?.blob.type).toBe('application/json');
      await expect(download.lastJson()).resolves.toEqual({
        format: 'facturath',
        kind: 'invoice',
        schemaVersion: SCHEMA_VERSION,
        invoice: open,
        assets: { 'logo-1': { type: 'image/png', data: PNG_BASE64 } },
      });
    });
  });

  describe('exportBackup', () => {
    it('writes every saved invoice, the profile, the preferences and all their images, dated today', async () => {
      const preferences = TestBed.inject(PREFERENCES_STORE);
      await preferences.saveProfile({ ...createEmptyProfile(), name: 'Taller', logoAssetId: 'logo-1' });
      await preferences.savePreferences({ ...createDefaultPreferences(), density: 'compact' });
      await settings.load();
      await assets.put('logo-1', png);
      await assets.put('qr-1', png);
      const first = invoice({ number: '0001', logoAssetId: 'logo-1' });
      const second = invoice({ number: '0002', transfermovilQrAssetId: 'qr-1' });
      await repository.save(first);
      await repository.save(second);

      await store.exportBackup(new Date(2026, 8, 19));

      expect(download.saved[0]?.name).toBe('facturath-copia-2026-09-19.json');
      const file = (await download.lastJson()) as BackupExportFile;
      expect(file).toMatchObject({ format: 'facturath', kind: 'backup', schemaVersion: SCHEMA_VERSION });
      expect(file.invoices).toEqual(expect.arrayContaining([first, second]));
      expect(file.invoices).toHaveLength(2);
      expect(file.profile).toMatchObject({ name: 'Taller', logoAssetId: 'logo-1' });
      expect(file.preferences.density).toBe('compact');
      expect(Object.keys(file.assets).sort()).toEqual(['logo-1', 'qr-1']);
    });
  });
});
