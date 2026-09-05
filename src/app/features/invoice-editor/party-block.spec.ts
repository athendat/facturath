import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PartyRole } from '../../domain/invoice';
import { InvoiceStore } from './invoice-store';
import { PartyBlock } from './party-block';

@Component({
  imports: [PartyBlock],
  template: `<app-party-block [role]="role()" />`,
})
class Host {
  readonly role = input.required<PartyRole>();
}

describe('PartyBlock', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let store: InvoiceStore;

  async function render(role: PartyRole): Promise<void> {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('role', role);
    element = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(InvoiceStore);
    await fixture.whenStable();
  }

  function labels(): string[] {
    return Array.from(element.querySelectorAll('input')).map(
      (input) => input.getAttribute('aria-label') ?? '',
    );
  }

  function input(label: string): HTMLInputElement {
    const found = element.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!found) {
      throw new Error(`No input labelled ${label}`);
    }
    return found;
  }

  async function type(label: string, text: string): Promise<void> {
    const field = input(label);
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  describe('seller', () => {
    beforeEach(() => render('seller'));

    it('renders the seller fields with distinct labels and no eyebrow', () => {
      expect(labels()).toEqual([
        'Nombre o razón social del vendedor',
        'Dirección del vendedor',
        'NIT del vendedor',
        'Registro comercial del vendedor',
        'Cuenta bancaria del vendedor',
        'Sucursal bancaria del vendedor',
      ]);
      expect(input('Nombre o razón social del vendedor').placeholder).toBe(
        'Tu nombre o razón social',
      );
      expect(element.textContent).not.toContain('Comprador');
    });

    it('writes each field to the seller in the store', async () => {
      await type('Nombre o razón social del vendedor', 'Taller Rodríguez');
      await type('Dirección del vendedor', 'Calle 23 #456');
      await type('NIT del vendedor', '12345678901');
      await type('Registro comercial del vendedor', 'REEUP 123');
      await type('Cuenta bancaria del vendedor', '0598 1234');
      await type('Sucursal bancaria del vendedor', 'BANDEC 4321');

      expect(store.invoice().seller).toEqual({
        name: 'Taller Rodríguez',
        address: 'Calle 23 #456',
        nit: '12345678901',
        identityCard: '',
        commercialRegistry: 'REEUP 123',
        bankAccount: '0598 1234',
        bankBranch: 'BANDEC 4321',
      });
    });
  });

  describe('buyer', () => {
    beforeEach(() => render('buyer'));

    it('renders the Comprador eyebrow and the buyer fields with distinct labels', () => {
      expect(element.querySelector('p')?.textContent?.trim()).toBe('Comprador');
      expect(labels()).toEqual([
        'Nombre o razón social del comprador',
        'Dirección del comprador',
        'NIT del comprador',
        'Carné de identidad del comprador',
        'Registro comercial del comprador',
        'Cuenta bancaria del comprador',
        'Sucursal bancaria del comprador',
      ]);
      expect(input('Nombre o razón social del comprador').placeholder).toBe(
        'Nombre y apellidos o razón social',
      );
    });

    it('writes each field to the buyer in the store', async () => {
      await type('Nombre o razón social del comprador', 'Ana Pérez');
      await type('Dirección del comprador', 'Ave. 51');
      await type('NIT del comprador', '98765432109');
      await type('Carné de identidad del comprador', '85010112345');
      await type('Registro comercial del comprador', 'RC 77');
      await type('Cuenta bancaria del comprador', '0300 9876');
      await type('Sucursal bancaria del comprador', 'BPA 12');

      expect(store.invoice().buyer).toEqual({
        name: 'Ana Pérez',
        address: 'Ave. 51',
        nit: '98765432109',
        identityCard: '85010112345',
        commercialRegistry: 'RC 77',
        bankAccount: '0300 9876',
        bankBranch: 'BPA 12',
      });
      expect(store.invoice().seller.name).toBe('');
    });
  });
});
