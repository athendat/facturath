import { Component, inject } from '@angular/core';
import type { FieldId } from '../../domain/compliance';
import { InlineInput } from '../../shared/ui/inline-input';
import { InvoiceStore } from './invoice-store';

/** The line fields the compliance rules can point at; code and detail are optional. */
type RequiredLineField = 'description' | 'unit' | 'quantity' | 'unitPrice';

@Component({
  selector: 'app-line-items-table',
  imports: [InlineInput],
  templateUrl: './line-items-table.html',
  styleUrl: './line-items-table.css',
})
export class LineItemsTable {
  protected readonly store = inject(InvoiceStore);

  protected lineField(index: number, field: RequiredLineField): FieldId {
    return `lines.${index}.${field}`;
  }
}
