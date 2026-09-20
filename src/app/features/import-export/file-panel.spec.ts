import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileDownload } from '../../core/file-download';
import { ObjectUrls } from '../../core/object-urls';
import { INVOICE_REPOSITORY } from '../../core/storage/ports';
import { findButton } from '../../core/testing/dom';
import { FakeFileDownload } from '../../core/testing/fake-file-download';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
import { createInvoice } from '../../domain/invoice';
import { FilePanel } from './file-panel';

describe('FilePanel', () => {
  let fixture: ComponentFixture<FilePanel>;
  let element: HTMLElement;
  let download: FakeFileDownload;

  beforeEach(async () => {
    download = new FakeFileDownload();
    await TestBed.configureTestingModule({
      imports: [FilePanel],
      providers: [
        { provide: FileDownload, useValue: download },
        { provide: ObjectUrls, useValue: new FakeObjectUrls() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FilePanel);
    element = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('invoice', { ...createInvoice('open-1'), series: 'B', number: '0003' });
    await fixture.whenStable();
  });

  it('is a dialog named Archivo with the export and import sections, kept off paper', () => {
    expect(element.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Archivo');
    expect(Array.from(element.querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual([
      'Exportar',
      'Importar',
    ]);
    expect(element.textContent).toContain(
      'La copia incluye todas las facturas guardadas, tus datos e imágenes.',
    );
    expect(element.hasAttribute('data-print-hide')).toBe(true);
  });

  it('labels both file inputs visibly and limits them to JSON', () => {
    const inputs = Array.from(element.querySelectorAll<HTMLInputElement>('input[type="file"]'));

    expect(inputs.map((input) => input.labels?.[0]?.textContent?.trim())).toEqual([
      'Importar factura',
      'Importar copia de seguridad',
    ]);
    expect(inputs.every((input) => input.accept === '.json,application/json')).toBe(true);
  });

  it('exports the open invoice on click', async () => {
    findButton(element, 'Exportar factura')?.click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(download.saved).toHaveLength(1));

    expect(download.saved[0]?.name).toBe('factura-B-0003.json');
  });

  it('exports a backup dated today on click', async () => {
    await TestBed.inject(INVOICE_REPOSITORY).save(createInvoice('saved-1'));

    findButton(element, 'Exportar copia de seguridad')?.click();
    await fixture.whenStable();
    await vi.waitFor(() => expect(download.saved).toHaveLength(1));

    expect(download.saved[0]?.name).toMatch(/^facturath-copia-\d{4}-\d{2}-\d{2}\.json$/);
    await expect(download.lastJson()).resolves.toMatchObject({ kind: 'backup' });
  });
});
