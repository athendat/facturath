import { Component, afterNextRender, computed, inject } from '@angular/core';
import { Printer } from './core/printer';
import { StorageStatus } from './core/storage/storage-status';
import { ToastService, type Toast } from './core/toast';
import { UpdateNotifier } from './core/update-notifier';
import { InvoiceEditor } from './features/invoice-editor/invoice-editor';
import { InvoiceStore } from './features/invoice-editor/invoice-store';
import { ToastHost } from './shared/ui/toast-host';

export const SAVING_DISABLED_NOTICE =
  'Este navegador no permite guardar. Puedes imprimir, pero la factura y tus datos se perderán al cerrar.';

@Component({
  selector: 'app-root',
  imports: [InvoiceEditor, ToastHost],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(InvoiceStore);
  protected readonly toasts = inject(ToastService);
  protected readonly printer = inject(Printer);
  private readonly storage = inject(StorageStatus);
  private readonly updateNotifier = inject(UpdateNotifier);

  /**
   * Shown in a second toast host of its own, so it neither auto-dismisses nor
   * gets replaced when a regular toast shows.
   */
  protected readonly storageNotice = computed<Toast | null>(() =>
    this.storage.savingDisabled() ? { message: SAVING_DISABLED_NOTICE } : null,
  );

  constructor() {
    // Browser only, after hydration: the service worker never runs during prerender.
    afterNextRender(() => this.updateNotifier.start());
  }
}
