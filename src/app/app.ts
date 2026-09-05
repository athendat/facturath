import { Component, afterNextRender, inject } from '@angular/core';
import { Printer } from './core/printer';
import { ToastService } from './core/toast';
import { UpdateNotifier } from './core/update-notifier';
import { InvoiceEditor } from './features/invoice-editor/invoice-editor';
import { InvoiceStore } from './features/invoice-editor/invoice-store';
import { ToastHost } from './shared/ui/toast-host';

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
  private readonly updateNotifier = inject(UpdateNotifier);

  constructor() {
    // Browser only, after hydration: the service worker never runs during prerender.
    afterNextRender(() => this.updateNotifier.start());
  }
}
