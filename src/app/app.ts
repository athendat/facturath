import { Component, inject } from '@angular/core';
import { InvoiceEditor } from './features/invoice-editor/invoice-editor';
import { InvoiceStore } from './features/invoice-editor/invoice-store';

@Component({
  selector: 'app-root',
  imports: [InvoiceEditor],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(InvoiceStore);
}
