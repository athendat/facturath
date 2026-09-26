import { Component, computed, inject } from '@angular/core';
import type { Party, PartyRole } from '../../domain/invoice';
import { BottomSheet } from '../../shared/ui/bottom-sheet';
import { SheetField } from '../../shared/ui/sheet-field';
import { InvoiceStore } from './invoice-store';
import { ZoneSheets } from './zone-sheets';
import { sheetFieldId, type ZoneKey } from './zones';

/** One field of a sheet: what it shows and where an edit goes. */
interface SheetFieldSpec {
  id: string;
  label: string;
  value: string;
  set: (value: string) => void;
  inputMode?: 'numeric' | 'decimal';
}

const HEADINGS: Partial<Record<ZoneKey, string>> = {
  buyer: 'Comprador',
};

/**
 * The bottom sheet of the open zone (#64), with full-size fields for its part of the
 * invoice. Every edit goes straight to the invoice store, so the zone, the totals and the
 * Res. 55 seal follow at once and the draft autosave keeps it as it keeps inline edits.
 */
@Component({
  selector: 'app-zone-sheet',
  imports: [BottomSheet, SheetField],
  template: `
    <app-bottom-sheet
      [open]="zone() !== null"
      (openChange)="onOpenChange($event)"
      [heading]="heading()"
    >
      <div class="fields">
        @for (field of fields(); track field.id) {
          <app-sheet-field
            [inputId]="field.id"
            [label]="field.label"
            [value]="field.value"
            [inputMode]="field.inputMode ?? null"
            (valueChange)="field.set($event)"
          />
        }
      </div>
    </app-bottom-sheet>
  `,
  styles: `
    .fields {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
  `,
})
export class ZoneSheet {
  private readonly store = inject(InvoiceStore);
  private readonly sheets = inject(ZoneSheets);

  protected readonly zone = this.sheets.current;

  protected readonly heading = computed(() => {
    const zone = this.zone();
    return zone === null ? '' : (HEADINGS[zone] ?? '');
  });

  protected readonly fields = computed<SheetFieldSpec[]>(() => {
    switch (this.zone()) {
      case 'buyer':
        return this.party('buyer');
      default:
        return [];
    }
  });

  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.sheets.close();
    }
  }

  private party(role: PartyRole): SheetFieldSpec[] {
    const party = this.store.invoice()[role];
    const field = (key: keyof Party, label: string, inputMode?: 'numeric'): SheetFieldSpec => ({
      id: sheetFieldId(`${role}.${key}`),
      label,
      value: party[key],
      set: (value) => this.store.updateParty(role, key, value),
      inputMode,
    });
    return [
      field('name', 'Nombre o razón social'),
      field('nit', 'NIT', 'numeric'),
      field('identityCard', 'Carné de identidad', 'numeric'),
      field('address', 'Dirección'),
      field('commercialRegistry', 'Registro comercial'),
      field('bankAccount', 'Cuenta bancaria', 'numeric'),
      field('bankBranch', 'Sucursal bancaria'),
    ];
  }
}
