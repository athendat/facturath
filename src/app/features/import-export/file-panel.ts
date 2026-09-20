import { Component, PendingTasks, inject, input, model, output } from '@angular/core';
import type { Invoice } from '../../domain/invoice';
import { Drawer } from '../../shared/ui/drawer';
import { ImportExportStore, type ImportResult } from './import-export-store';

let nextId = 0;

/**
 * Export and import in one side panel: the open invoice or a full backup out
 * as a JSON file, and either kind of file back in. The shell passes the open
 * invoice and acts on what an import brought (`imported`).
 */
@Component({
  selector: 'app-file-panel',
  imports: [Drawer],
  template: `
    <app-drawer [(open)]="open" heading="Archivo">
      <section class="group" [attr.aria-labelledby]="id + '-export'">
        <h3 class="title" [id]="id + '-export'">Exportar</h3>
        <div class="actions">
          <button type="button" class="button" (click)="store.exportInvoice(invoice())">
            Exportar factura
          </button>
          <button type="button" class="button" (click)="store.exportBackup(today())">
            Exportar copia de seguridad
          </button>
        </div>
        <p class="hint">La copia incluye todas las facturas guardadas, tus datos e imágenes.</p>
      </section>

      <section class="group" [attr.aria-labelledby]="id + '-import'">
        <h3 class="title" [id]="id + '-import'">Importar</h3>
        <div class="field">
          <label class="label" [for]="id + '-invoice'">Importar factura</label>
          <input
            class="file"
            type="file"
            accept=".json,application/json"
            [id]="id + '-invoice'"
            (change)="onFileChosen($event)"
          />
        </div>
        <div class="field">
          <label class="label" [for]="id + '-backup'">Importar copia de seguridad</label>
          <input
            class="file"
            type="file"
            accept=".json,application/json"
            [id]="id + '-backup'"
            (change)="onFileChosen($event)"
          />
        </div>
      </section>
    </app-drawer>
  `,
  styles: `
    .group + .group {
      margin-top: var(--sp-5);
      padding-top: var(--sp-4);
      border-top: 1px solid var(--border-1);
    }

    .title {
      margin: 0 0 var(--sp-3);
      font-size: var(--fs-14);
      font-weight: var(--fw-bold);
    }

    .actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--sp-2);
    }

    .button {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid var(--border-2);
      border-radius: var(--radius-xs);
      background: var(--bg-0);
      color: var(--gem-900);
      font-size: 13px;
      font-weight: var(--fw-medium);
      cursor: pointer;
    }

    .button:hover {
      background: var(--bg-2);
    }

    .button:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }

    .hint {
      margin: var(--sp-3) 0 0;
      color: var(--fg-2);
      font-size: var(--fs-12);
    }

    .field + .field {
      margin-top: var(--sp-3);
    }

    .label {
      display: block;
      margin-bottom: 3px;
      color: var(--fg-2);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
    }

    .file {
      display: block;
      width: 100%;
      font-size: var(--fs-14);
    }

    .file:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }
  `,
  host: { 'data-print-hide': '' },
})
export class FilePanel {
  protected readonly store = inject(ImportExportStore);
  private readonly pendingTasks = inject(PendingTasks);

  readonly open = model(false);
  /** The invoice "Exportar factura" writes. */
  readonly invoice = input.required<Invoice>();
  /** What an import brought in, for the shell to open or refresh; never `invalid`. */
  readonly imported = output<ImportResult>();

  protected readonly id = `file-${nextId++}`;

  /** Only read on click, so the prerender never depends on the clock. */
  protected today(): Date {
    return new Date();
  }

  /** Reads the chosen file; the input is cleared so the same file can be picked again. */
  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    // A pending task, so the app is not stable (nor `whenStable` in tests) until the import settled.
    const done = this.pendingTasks.add();
    let result: ImportResult;
    try {
      result = await this.store.importFile(file);
    } finally {
      done();
    }
    input.value = '';
    if (result.kind !== 'invalid') {
      this.imported.emit(result);
    }
  }
}
