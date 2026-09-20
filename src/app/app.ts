import {
  Component,
  ElementRef,
  PendingTasks,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Printer } from './core/printer';
import { StorageStatus } from './core/storage/storage-status';
import { ToastService, type Toast } from './core/toast';
import { UpdateNotifier } from './core/update-notifier';
import { FilePanel } from './features/import-export/file-panel';
import type { ImportResult } from './features/import-export/import-export-store';
import { CompliancePanel } from './features/invoice-editor/compliance-panel';
import { DraftAutosave } from './features/invoice-editor/draft-autosave';
import { InvoiceEditor } from './features/invoice-editor/invoice-editor';
import { InvoiceStore } from './features/invoice-editor/invoice-store';
import { SavedInvoicesDrawer } from './features/saved-invoices/saved-invoices-drawer';
import { SavedInvoicesStore } from './features/saved-invoices/saved-invoices-store';
import { SettingsPanel } from './features/settings/settings-panel';
import { ToastHost } from './shared/ui/toast-host';

export const SAVING_DISABLED_NOTICE =
  'Este navegador no permite guardar. Puedes imprimir, pero la factura y tus datos se perderán al cerrar.';

@Component({
  selector: 'app-root',
  imports: [CompliancePanel, FilePanel, InvoiceEditor, SavedInvoicesDrawer, SettingsPanel, ToastHost],
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
  private readonly autosave = inject(DraftAutosave);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly menuToggle = viewChild.required<ElementRef<HTMLButtonElement>>('menuToggle');

  /**
   * Whether the collapsed header menu is showing. It only has an effect below the
   * breakpoint; above it, CSS lays the menu out as the header row and hides the toggle.
   */
  protected readonly menuOpen = signal(false);

  protected readonly drawerOpen = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly complianceOpen = signal(false);
  protected readonly fileOpen = signal(false);

  /**
   * Shown in a second toast host of its own, so it neither auto-dismisses nor
   * gets replaced when a regular toast shows.
   */
  protected readonly storageNotice = computed<Toast | null>(() =>
    this.storage.savingDisabled() ? { message: SAVING_DISABLED_NOTICE } : null,
  );

  constructor() {
    // Browser only, after hydration: the service worker never runs during prerender, and the
    // saved invoices and the draft come from storage. The saved invoices load before the
    // draft is read, since a new invoice takes its number from them. Neither call rejects.
    // The startup counts as a pending task so the app (and `whenStable` in tests) is not
    // stable until the open invoice is settled.
    afterNextRender(async () => {
      this.updateNotifier.start();
      const done = this.pendingTasks.add();
      try {
        await this.saved.load();
        await this.autosave.start(new Date(), (series) => this.saved.nextNumber(series));
      } finally {
        done();
      }
    });
  }

  /** Shows or hides the collapsed menu. */
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /**
   * Closes the menu and takes focus back to the toggle, the way a disclosure should.
   * It stays open while a panel is up, so the panel can return focus to the control
   * that opened it. Above the breakpoint nothing is collapsed and this does nothing.
   */
  protected closeMenu(): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    this.menuToggle().nativeElement.focus();
  }

  /** Saves into history; the draft slot follows so it never lags behind. */
  protected async save(): Promise<void> {
    await this.saved.save(this.store.invoice());
    await this.autosave.writeNow();
  }

  /** Starts the next invoice of the current series and makes it the draft at once. */
  protected startNew(): void {
    this.store.startNew(this.saved.nextNumber(this.store.invoice().series));
    // Not awaited: the click handler has nothing to wait for, and `writeNow` never rejects.
    void this.autosave.writeNow();
  }

  /** Puts the saved invoice in the editor and closes the drawer. */
  protected async openSaved(id: string): Promise<void> {
    const invoice = await this.saved.get(id);
    if (invoice !== null) {
      this.store.load(invoice);
      this.drawerOpen.set(false);
    }
  }

  /**
   * An imported invoice opens in the editor like a saved one (its own images kept) and the
   * panel closes; an imported backup refreshes the saved count and leaves the panel open.
   */
  protected async onImported(result: ImportResult): Promise<void> {
    if (result.kind === 'invoice') {
      this.store.load(result.invoice);
      this.fileOpen.set(false);
    } else if (result.kind === 'backup') {
      await this.saved.load();
    }
  }
}
