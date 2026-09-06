import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImagesStore, type ImageKind } from '../../core/images-store';
import { ObjectUrls } from '../../core/object-urls';
import { SettingsStore } from '../../core/settings-store';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
import { ImageControl } from './image-control';

@Component({
  imports: [ImageControl],
  template: `<app-image-control [kind]="kind()" />`,
})
class Host {
  readonly kind = input.required<ImageKind>();
}

const png = new File(['png-bytes'], 'logo.png', { type: 'image/png' });

describe('ImageControl', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let objectUrls: FakeObjectUrls;

  async function render(kind: ImageKind): Promise<void> {
    objectUrls = new FakeObjectUrls();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [{ provide: ObjectUrls, useValue: objectUrls }],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('kind', kind);
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

  describe('logo', () => {
    it('starts as an upload box that never prints', async () => {
      await render('logo');

      expect(control().hasAttribute('data-print-hide')).toBe(true);
      expect(element.textContent).toContain('Subir logo');
      expect(fileInput('Subir logo').accept).toBe('image/*');
      expect(element.querySelector('img')).toBeNull();
      expect(removeButton('Quitar logo')).toBeNull();
    });

    it('shows the chosen image in the document and prints it', async () => {
      await render('logo');

      await choose('Subir logo', png);

      const image = element.querySelector<HTMLImageElement>('img[alt="Logo"]');
      expect(image?.getAttribute('src')).toBe('blob:fake/1');
      expect(control().hasAttribute('data-print-hide')).toBe(false);
      expect(element.textContent).not.toContain('Subir logo');
      expect(TestBed.inject(SettingsStore).profile().logoAssetId).toEqual(expect.any(String));
      expect(fileInput('Subir logo').value).toBe('');
    });

    it('offers a remove control only while an image is set, and never prints it', async () => {
      await render('logo');
      await choose('Subir logo', png);
      const remove = removeButton('Quitar logo');
      expect(remove?.hasAttribute('data-print-hide')).toBe(true);

      remove?.click();
      await fixture.whenStable();

      expect(element.querySelector('img')).toBeNull();
      expect(element.textContent).toContain('Subir logo');
      expect(removeButton('Quitar logo')).toBeNull();
      expect(objectUrls.revoked).toEqual(['blob:fake/1']);
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

      await choose('Subir QR de Transfermóvil', png);

      expect(element.querySelector('img[alt="QR Transfermóvil"]')).not.toBeNull();
      expect(removeButton('Quitar QR de Transfermóvil')).not.toBeNull();
      expect(element.textContent?.trim()).toBe('Transfermóvil');
      expect(TestBed.inject(ImagesStore).urls().transfermovilQr).toBe('blob:fake/1');
    });

    it('labels the EnZona control and captions it', async () => {
      await render('enzonaQr');
      expect(element.textContent).toContain('Subir QR EnZona');

      await choose('Subir QR de EnZona', png);

      expect(element.querySelector('img[alt="QR EnZona"]')).not.toBeNull();
      expect(removeButton('Quitar QR de EnZona')).not.toBeNull();
      expect(element.textContent?.trim()).toBe('EnZona');
    });
  });
});
