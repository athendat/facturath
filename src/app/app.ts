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
import { formatReference } from './domain/format';
import { FilePanel } from './features/import-export/file-panel';
import type { ImportResult } from './features/import-export/import-export-store';
import { CompliancePanel } from './features/invoice-editor/compliance-panel';
import { DraftAutosave } from './features/invoice-editor/draft-autosave';
import { InvoiceEditor } from './features/invoice-editor/invoice-editor';
import { InvoiceStore } from './features/invoice-editor/invoice-store';
import { SavedInvoicesDrawer } from './features/saved-invoices/saved-invoices-drawer';
import { SavedInvoicesStore } from './features/saved-invoices/saved-invoices-store';
import { SettingsPanel } from './features/settings/settings-panel';
import { ComplianceSeal } from './shared/ui/compliance-seal';
import { Icon } from './shared/ui/icon';
import { MenuButton, type MenuItem } from './shared/ui/menu-button';
import { MenuDrawer, type MenuDrawerCommand } from './shared/ui/menu-drawer';
import { ToastHost } from './shared/ui/toast-host';

export const SAVING_DISABLED_NOTICE =
  'Este navegador no permite guardar. Puedes imprimir, pero la factura y tus datos se perderán al cerrar.';

@Component({
  selector: 'app-root',
  imports: [
    ComplianceSeal,
    CompliancePanel,
    FilePanel,
    Icon,
    InvoiceEditor,
    MenuButton,
    MenuDrawer,
    SavedInvoicesDrawer,
    SettingsPanel,
    ToastHost,
  ],
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
  private readonly hamburger = viewChild.required<ElementRef<HTMLButtonElement>>('hamburger');

  /** Whether the phone menu drawer is open. */
  protected readonly menuOpen = signal(false);

  protected readonly drawerOpen = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly complianceOpen = signal(false);
  protected readonly fileOpen = signal(false);

  /** The phone's hamburger carries the pending count, since its header has no seal. */
  protected readonly menuLabel = computed(() => {
    const pending = this.store.pendingCount();
    return pending === 0
      ? 'Menú de acciones'
      : `Menú de acciones, ${pending} datos obligatorios pendientes`;
  });

  /** The number the next invoice of the open series gets, as the header writes it. */
  protected readonly nextReference = computed(() => {
    const series = this.store.invoice().series;
    return formatReference(series, this.saved.nextNumber(series));
  });

  /** The commands behind "Más" on a wide screen, grouped by what they act on. */
  protected readonly moreItems = computed<readonly MenuItem[]>(() => [
    { id: 'new', label: 'Nueva factura', icon: 'new', detail: this.nextReference() },
    {
      id: 'saved',
      label: 'Facturas guardadas',
      icon: 'list',
      detail: String(this.saved.count()),
      separatorBefore: true,
    },
    { id: 'file', label: 'Exportar / importar', icon: 'file' },
    { id: 'settings', label: 'Ajustes', icon: 'settings', separatorBefore: true },
  ]);

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

  /** Runs the command chosen in the "Más" menu: the same action or panel as before #61. */
  protected run(command: string): void {
    switch (command) {
      case 'new':
        this.startNew();
        break;
      case 'saved':
        this.drawerOpen.set(true);
        break;
      case 'file':
        this.fileOpen.set(true);
        break;
      case 'settings':
        this.settingsOpen.set(true);
        break;
    }
  }

  /**
   * Runs a command from the phone menu. The menu closes first and focus goes back to the
   * hamburger before any panel opens, so the panel takes the hamburger as the control to
   * return focus to, not a row of a menu that is no longer there.
   */
  protected runFromMenu(command: MenuDrawerCommand): void {
    this.menuOpen.set(false);
    this.hamburger().nativeElement.focus();
    if (command === 'compliance') {
      this.complianceOpen.set(true);
    } else {
      this.run(command);
    }
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
