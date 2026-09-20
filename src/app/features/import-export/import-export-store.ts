import { Service, inject } from '@angular/core';
import { blobToBase64 } from '../../core/base64';
import { FileDownload } from '../../core/file-download';
import { SettingsStore } from '../../core/settings-store';
import { ASSET_STORE, INVOICE_REPOSITORY } from '../../core/storage/ports';
import { formatLocalIsoDate } from '../../domain/dates';
import {
  EXPORT_FORMAT,
  backupExportFileName,
  invoiceExportFileName,
  type ExportFile,
  type ExportedAssets,
} from '../../domain/export-format';
import { ASSET_ID_FIELDS, SCHEMA_VERSION, type AssetIds, type Invoice } from '../../domain/invoice';

/**
 * Moves invoices between devices through JSON files: exports build a file and
 * hand it to the browser to save; imports validate, upgrade and store what a
 * file holds. Persistence goes through the storage ports only.
 */
@Service()
export class ImportExportStore {
  private readonly assets = inject(ASSET_STORE);
  private readonly repository = inject(INVOICE_REPOSITORY);
  private readonly settings = inject(SettingsStore);
  private readonly download = inject(FileDownload);

  /**
   * Saves every stored invoice, the profile, the preferences and all the images
   * they reference as `facturath-copia-<YYYY-MM-DD>.json`, dated `today`.
   */
  async exportBackup(today: Date): Promise<void> {
    const summaries = await this.repository.listSummaries();
    const invoices: Invoice[] = [];
    for (const { id } of summaries) {
      const invoice = await this.repository.get(id);
      if (invoice !== null) {
        invoices.push(invoice);
      }
    }
    const profile = this.settings.profile();
    const file: ExportFile = {
      format: EXPORT_FORMAT,
      kind: 'backup',
      schemaVersion: SCHEMA_VERSION,
      invoices,
      profile,
      preferences: this.settings.preferences(),
      assets: await this.inlineAssets([profile, ...invoices].flatMap(assetIdsOf)),
    };
    this.save(backupExportFileName(formatLocalIsoDate(today)), file);
  }

  /** Saves `invoice` with the images it references as `factura-<series>-<number>.json`. */
  async exportInvoice(invoice: Invoice): Promise<void> {
    const file: ExportFile = {
      format: EXPORT_FORMAT,
      kind: 'invoice',
      schemaVersion: SCHEMA_VERSION,
      invoice,
      assets: await this.inlineAssets(assetIdsOf(invoice)),
    };
    this.save(invoiceExportFileName(invoice), file);
  }

  /** The stored images among `ids`, inlined as base64; a missing blob is left out. */
  private async inlineAssets(ids: Iterable<string>): Promise<ExportedAssets> {
    const assets: ExportedAssets = {};
    for (const id of new Set(ids)) {
      const blob = await this.assets.get(id);
      if (blob !== null) {
        assets[id] = { type: blob.type, data: await blobToBase64(blob) };
      }
    }
    return assets;
  }

  private save(name: string, file: ExportFile): void {
    this.download.save(name, new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
  }
}

/** The asset ids `record` points at, without the nulls. */
function assetIdsOf(record: AssetIds): string[] {
  return ASSET_ID_FIELDS.map((field) => record[field]).filter((id): id is string => id !== null);
}
