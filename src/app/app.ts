import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { Printer } from './core/printer';
import { StorageStatus } from './core/storage/storage-status';
import { ToastService, type Toast } from './core/toast';
import { UpdateNotifier } from './core/update-notifier';
import { InvoiceEditor } from './features/invoice-editor/invoice-editor';
import { InvoiceStore } from './features/invoice-editor/invoice-store';
import { SavedInvoicesDrawer } from './features/saved-invoices/saved-invoices-drawer';
import { SavedInvoicesStore } from './features/saved-invoices/saved-invoices-store';
import { ToastHost } from './shared/ui/toast-host';

export const SAVING_DISABLED_NOTICE =
  'Este navegador no permite guardar. Puedes imprimir, pero la factura y tus datos se perderán al cerrar.';

@Component({
  selector: 'app-root',
  imports: [InvoiceEditor, SavedInvoicesDrawer, ToastHost],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(InvoiceStore);
  protected readonly saved = inject(SavedInvoicesStore);
  protected readonly toasts = inject(ToastService);
  protected readonly printer = inject(Printer);
  private readonly storage = inject(StorageStatus);
  private readonly updateNotifier = inject(UpdateNotifier);

  protected readonly drawerOpen = signal(false);

  /**
   * Shown in a second toast host of its own, so it neither auto-dismisses nor
   * gets replaced when a regular toast shows.
   */
  protected readonly storageNotice = computed<Toast | null>(() =>
    this.storage.savingDisabled() ? { message: SAVING_DISABLED_NOTICE } : null,
  );

  constructor() {
    // Browser only, after hydration: the service worker never runs during prerender, and the
    // saved invoices come from storage. `load` reports its own failure and never rejects.
    afterNextRender(() => {
      this.updateNotifier.start();
      void this.saved.load();
    });
  }

  protected save(): Promise<void> {
    return this.saved.save(this.store.invoice());
  }

  /** Starts the next invoice of the current series. */
  protected startNew(): void {
    this.store.startNew(this.saved.nextNumber(this.store.invoice().series));
  }

  /** Puts the saved invoice in the editor and closes the drawer. */
  protected async openSaved(id: string): Promise<void> {
    const invoice = await this.saved.get(id);
    if (invoice !== null) {
      this.store.load(invoice);
      this.drawerOpen.set(false);
    }
  }
}
