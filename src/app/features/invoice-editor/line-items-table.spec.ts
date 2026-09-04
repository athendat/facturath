import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LineItemsTable } from './line-items-table';

describe('LineItemsTable', () => {
  let fixture: ComponentFixture<LineItemsTable>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LineItemsTable] }).compileComponents();
    fixture = TestBed.createComponent(LineItemsTable);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function rows(): HTMLTableRowElement[] {
    return Array.from(element.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  }

  function inputIn(row: HTMLTableRowElement, label: string): HTMLInputElement {
    const input = row.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!input) {
      throw new Error(`No input labelled ${label}`);
    }
    return input;
  }

  async function type(input: HTMLInputElement, text: string): Promise<void> {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  async function click(label: string): Promise<void> {
    const button = element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    if (!button) {
      throw new Error(`No button labelled ${label}`);
    }
    button.click();
    await fixture.whenStable();
  }

  it('starts with a single row', () => {
    expect(rows()).toHaveLength(1);
  });

  it('adds a row when the add button is clicked', async () => {
    await click('Agregar línea');

    expect(rows()).toHaveLength(2);
  });

  it('removes the row whose delete button is clicked', async () => {
    await click('Agregar línea');
    await type(inputIn(rows()[0], 'Cantidad'), '2');
    await type(inputIn(rows()[1], 'Cantidad'), '5');

    await click('Eliminar línea 1');

    expect(rows()).toHaveLength(1);
    expect(inputIn(rows()[0], 'Cantidad').value).toBe('5');
  });

  it('leaves one empty row after removing the last row', async () => {
    await type(inputIn(rows()[0], 'Descripción'), 'Servicio');
    await type(inputIn(rows()[0], 'Cantidad'), '3');

    await click('Eliminar línea 1');

    expect(rows()).toHaveLength(1);
    expect(inputIn(rows()[0], 'Descripción').value).toBe('');
    expect(inputIn(rows()[0], 'Cantidad').value).toBe('1');
  });
});
