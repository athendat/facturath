import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IMAGE_KINDS, type ImageKind } from '../../domain/invoice';
import { ImageControl } from './image-control';

/** Wires the control the way a store would: a chosen file shows, a removal clears. */
@Component({
  imports: [ImageControl],
  template: `
    <app-image-control
      [kind]="kind()"
      [url]="url()"
      (fileChosen)="onChosen($event)"
      (removed)="onRemoved()"
    />
  `,
})
class Host {
  readonly kind = input.required<ImageKind>();
  readonly url = signal<string | null>(null);
  readonly chosen: File[] = [];
  removals = 0;

  onChosen(file: File): void {
    this.chosen.push(file);
    this.url.set(`blob:fake/${this.chosen.length}`);
  }

  onRemoved(): void {
    this.removals++;
    this.url.set(null);
  }
}

const png = new File(['png-bytes'], 'logo.png', { type: 'image/png' });

describe('ImageControl', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let element: HTMLElement;

  async function render(kind: ImageKind): Promise<void> {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('kind', kind);
    host = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  function control(): HTMLElement {
    return element.querySelector('app-image-control') as HTMLElement;
  }

  function fileInput(label: string): HTMLInputElement {
    const found = element.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!found) {
      throw new Error(`No file input labelled ${label}`);
    }
    return found;
  }

  function removeButton(label: string): HTMLButtonElement | null {
    return element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  }

  async function choose(label: string, file: File): Promise<void> {
    const input = fileInput(label);
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
  }

  // WCAG 2.5.3 Label in Name: the accessible name of the file control is its visible text.
  it.each(IMAGE_KINDS)('names the %s file control after the visible upload text', async (kind) => {
    await render(kind);

    const visible = element.querySelector('.placeholder')?.textContent?.trim();
    expect(visible).toMatch(/^Subir /);
    expect(element.querySelector('input[type="file"]')?.getAttribute('aria-label')).toBe(visible);
  });

  describe('logo', () => {
    it('starts as an upload box that never prints', async () => {
      await render('logo');

      expect(control().hasAttribute('data-print-hide')).toBe(true);
      expect(element.textContent).toContain('Subir logo');
      expect(fileInput('Subir logo').accept).toBe('image/*');
      expect(element.querySelector('img')).toBeNull();
      expect(removeButton('Quitar logo')).toBeNull();
    });

    it('reports the chosen file and shows the image it is given, which prints', async () => {
      await render('logo');

      await choose('Subir logo', png);

      expect(host.chosen).toEqual([png]);
      const image = element.querySelector<HTMLImageElement>('img[alt="Logo"]');
      expect(image?.getAttribute('src')).toBe('blob:fake/1');
      expect(control().hasAttribute('data-print-hide')).toBe(false);
      expect(element.textContent).not.toContain('Subir logo');
      expect(fileInput('Subir logo').value).toBe('');
    });

    it('takes its size from --logo-size, spacious when nothing sets it', async () => {
      await render('logo');

      expect(control().style.getPropertyValue('--size')).toBe('var(--logo-size, 64px)');
    });

    it('offers a remove control only while an image is set, and never prints it', async () => {
      await render('logo');
      await choose('Subir logo', png);
      const remove = removeButton('Quitar logo');
      expect(remove?.hasAttribute('data-print-hide')).toBe(true);

      remove?.click();
      await fixture.whenStable();

      expect(host.removals).toBe(1);
      expect(element.querySelector('img')).toBeNull();
      expect(element.textContent).toContain('Subir logo');
      expect(removeButton('Quitar logo')).toBeNull();
    });

    it('moves focus to the file control when the remove button goes away', async () => {
      await render('logo');
      await choose('Subir logo', png);
      const remove = removeButton('Quitar logo');
      remove?.focus();
      expect(document.activeElement).toBe(remove);

      remove?.click();
      await fixture.whenStable();

      expect(document.activeElement).toBe(fileInput('Subir logo'));
    });

    it('has no caption', async () => {
      await render('logo');
      await choose('Subir logo', png);

      expect(element.textContent?.trim()).toBe('');
    });
  });

  describe('payment QR codes', () => {
    it('labels the Transfermóvil control and captions it', async () => {
      await render('transfermovilQr');
      expect(element.textContent).toContain('Subir QR Transfermóvil');

      await choose('Subir QR Transfermóvil', png);

      expect(element.querySelector('img[alt="QR Transfermóvil"]')).not.toBeNull();
      expect(removeButton('Quitar QR de Transfermóvil')).not.toBeNull();
      expect(element.textContent?.trim()).toBe('Transfermóvil');
      expect(control().style.getPropertyValue('--size')).toBe('72px');
    });

    it('labels the EnZona control and captions it', async () => {
      await render('enzonaQr');
      expect(element.textContent).toContain('Subir QR EnZona');

      await choose('Subir QR EnZona', png);

      expect(element.querySelector('img[alt="QR EnZona"]')).not.toBeNull();
      expect(removeButton('Quitar QR de EnZona')).not.toBeNull();
      expect(element.textContent?.trim()).toBe('EnZona');
    });
  });
});
