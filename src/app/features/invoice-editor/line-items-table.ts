import { Component, inject } from '@angular/core';
import { InlineInput } from '../../shared/ui/inline-input';
import { InvoiceStore } from './invoice-store';

@Component({
  selector: 'app-line-items-table',
  imports: [InlineInput],
  templateUrl: './line-items-table.html',
  styleUrl: './line-items-table.css',
})
export class LineItemsTable {
  protected readonly store = inject(InvoiceStore);
}
