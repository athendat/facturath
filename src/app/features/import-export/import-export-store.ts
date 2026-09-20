import { Service, inject } from '@angular/core';
import { base64ToBlob, blobToBase64 } from '../../core/base64';
import { FileDownload } from '../../core/file-download';
import { SettingsStore } from '../../core/settings-store';
import { ASSET_STORE, INVOICE_REPOSITORY } from '../../core/storage/ports';
import { QUOTA_FULL_MESSAGE, isQuotaExceeded } from '../../core/storage/quota';
import { ToastService } from '../../core/toast';
import { formatLocalIsoDate } from '../../domain/dates';
import {
  EXPORT_FORMAT,
  backupExportFileName,
  invoiceExportFileName,
  migrateExportFile,
  validateExportFile,
  type ExportFile,
  type ExportedAssets,
} from '../../domain/export-format';
import { formatReference } from '../../domain/format';
import { ASSET_ID_FIELDS, SCHEMA_VERSION, type AssetIds, type Invoice } from '../../domain/invoice';

export const INVALID_FILE_MESSAGE = 'El archivo no es una exportación de FACTURATH.';
export const IMPORT_FAILED_MESSAGE = 'No se pudo importar el archivo.';

/** What `importFile` read: an invoice for the shell to open, a merged backup, or nothing. */
export type ImportResult =
  | { kind: 'invoice'; invoice: Invoice }
  | { kind: 'backup'; imported: number }
  | { kind: 'invalid' };

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
  private readonly toasts = inject(ToastService);

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

  /**
   * Reads an exported file: its images go into the asset store under their own ids
   * and an invoice is returned for the shell to open. A file that is not a FACTURATH
   * export, or a write the store refuses, is reported as a toast; never rejects.
   */
  async importFile(file: Blob): Promise<ImportResult> {
    const read = await this.read(file);
    if (read === null) {
      this.toasts.show(INVALID_FILE_MESSAGE);
      return { kind: 'invalid' };
    }
    const { exported, blobs } = read;
    try {
      for (const [id, blob] of blobs) {
        await this.assets.put(id, blob);
      }
      if (exported.kind === 'invoice') {
        const { invoice } = exported;
        this.toasts.show(`Factura ${formatReference(invoice.series, invoice.number)} importada.`);
        return { kind: 'invoice', invoice };
      }
      // The repository replaces an existing invoice with the same series and number, so
      // saving one by one merges the backup into the history without touching the rest.
      for (const invoice of exported.invoices) {
        await this.repository.save(invoice);
      }
      const imported = exported.invoices.length;
      this.toasts.show(`Copia importada: ${imported} ${imported === 1 ? 'factura' : 'facturas'}.`);
      return { kind: 'backup', imported };
    } catch (error) {
      this.toasts.show(isQuotaExceeded(error) ? QUOTA_FULL_MESSAGE : IMPORT_FAILED_MESSAGE);
      return { kind: 'invalid' };
    }
  }

  /**
   * The upgraded export `file` holds with its images decoded, or null when it is
   * not a FACTURATH export the app can read (bad JSON, wrong shape, bad base64).
   */
  private async read(file: Blob): Promise<{ exported: ExportFile; blobs: Map<string, Blob> } | null> {
    try {
      const validated = validateExportFile(JSON.parse(await file.text()));
      if (validated === null) {
        return null;
      }
      const exported = migrateExportFile(validated);
      const blobs = new Map<string, Blob>();
      for (const [id, { type, data }] of Object.entries(exported.assets)) {
        blobs.set(id, base64ToBlob(data, type));
      }
      return { exported, blobs };
    } catch {
      return null;
    }
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
