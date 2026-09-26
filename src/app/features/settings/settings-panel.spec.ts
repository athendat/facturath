import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImagesStore } from '../../core/images-store';
import { ObjectUrls } from '../../core/object-urls';
import { SettingsStore } from '../../core/settings-store';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
import { UsageStats } from '../../core/usage-stats';
import { PROFILE_TEXT_FIELDS } from '../../domain/seller-profile';
import { SettingsPanel } from './settings-panel';

const PROFILE_LABELS = {
  name: 'Nombre o razón social',
  address: 'Dirección',
  nit: 'NIT',
  commercialRegistry: 'Registro comercial',
  bankAccount: 'Cuenta bancaria',
  bankBranch: 'Sucursal bancaria',
} as const;

const SECTIONS = [
  ['showCarrier', 'Mostrar transportista'],
  ['showSignatures', 'Mostrar firmas'],
  ['showPaymentQr', 'Mostrar QR de pago'],
] as const;

describe('SettingsPanel', () => {
  let fixture: ComponentFixture<SettingsPanel>;
  let element: HTMLElement;
  let settings: SettingsStore;
  const usageEnabled = signal(true);
  const usage = { enabled: usageEnabled.asReadonly(), setEnabled: vi.fn((on: boolean) => usageEnabled.set(on)) };

  beforeEach(async () => {
    usageEnabled.set(true);
    usage.setEnabled.mockClear();
    await TestBed.configureTestingModule({
      imports: [SettingsPanel],
      providers: [
        { provide: ObjectUrls, useValue: new FakeObjectUrls() },
        { provide: UsageStats, useValue: usage },
      ],
    }).compileComponents();
    settings = TestBed.inject(SettingsStore);
    fixture = TestBed.createComponent(SettingsPanel);
    element = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
  });

  /** The form control whose visible `<label>` reads exactly `text`. */
  function control(text: string): HTMLInputElement {
    const label = Array.from(element.querySelectorAll('label')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
    const found = label?.control ?? label?.querySelector('input');
    if (!(found instanceof HTMLInputElement)) {
      throw new Error(`No control labelled ${text}`);
    }
    return found;
  }

  function type(text: string, value: string): void {
    const input = control(text);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function check(text: string, checked: boolean): void {
    const input = control(text);
    input.checked = checked;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('is a dialog named Ajustes with its four sections, kept off paper', () => {
    const dialog = element.querySelector('[role="dialog"]');

    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Ajustes');
    expect(Array.from(element.querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual([
      'Datos del emisor',
      'Imágenes',
      'Diseño',
      'Privacidad',
    ]);
    expect(element.hasAttribute('data-print-hide')).toBe(true);
  });

  describe('seller profile', () => {
    it.each(PROFILE_TEXT_FIELDS)('writes %s to the profile as typed', async (field) => {
      type(PROFILE_LABELS[field], 'valor nuevo');
      await fixture.whenStable();

      expect(settings.profile()[field]).toBe('valor nuevo');
    });

    it('shows an edit made from the document', async () => {
      settings.updateProfile('nit', '12345678901');
      await fixture.whenStable();

      expect(control('NIT').value).toBe('12345678901');
    });
  });

  describe('images', () => {
    it('stores a chosen logo in the profile and shows it', async () => {
      const input = element.querySelector<HTMLInputElement>('input[aria-label="Subir logo"]');
      Object.defineProperty(input, 'files', {
        value: [new File(['png'], 'logo.png', { type: 'image/png' })],
        configurable: true,
      });

      input?.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.whenStable();

      expect(settings.profile().logoAssetId).toEqual(expect.any(String));
      expect(element.querySelector('img[alt="Logo"]')?.getAttribute('src')).toMatch(/^blob:/);
    });

    it('offers both payment QR codes and removes one through the images store', async () => {
      const images = TestBed.inject(ImagesStore);
      await images.set('enzonaQr', new Blob(['png'], { type: 'image/png' }));
      await fixture.whenStable();
      expect(element.querySelector('input[aria-label="Subir QR Transfermóvil"]')).not.toBeNull();

      element.querySelector<HTMLButtonElement>('button[aria-label="Quitar QR de EnZona"]')?.click();
      await fixture.whenStable();

      expect(images.urls().enzonaQr).toBeNull();
      expect(settings.profile().enzonaQrAssetId).toBeNull();
    });
  });

  describe('layout', () => {
    it('offers the density as a radio group, spacious by default, and stores the choice', async () => {
      const compact = control('Compacta');
      const spacious = control('Espaciosa');
      expect(compact.type).toBe('radio');
      expect(compact.name).toBe(spacious.name);
      expect(spacious.checked).toBe(true);

      check('Compacta', true);
      await fixture.whenStable();

      expect(settings.density()).toBe('compact');
      expect(control('Compacta').checked).toBe(true);
      expect(control('Espaciosa').checked).toBe(false);
    });

    it.each(SECTIONS)('stores %s from the checkbox %s', async (flag, label) => {
      expect(control(label).type).toBe('checkbox');
      expect(control(label).checked).toBe(true);

      check(label, false);
      await fixture.whenStable();
      expect(settings.preferences()[flag]).toBe(false);

      check(label, true);
      await fixture.whenStable();
      expect(settings.preferences()[flag]).toBe(true);
    });

    it('shows a density chosen elsewhere', async () => {
      settings.setDensity('compact');
      await fixture.whenStable();

      expect(control('Compacta').checked).toBe(true);
    });
  });

  describe('privacy', () => {
    const LABEL = 'Enviar estadísticas anónimas de uso';

    it('shows the anonymous usage counters as a checkbox explained by the text below it', () => {
      const box = control(LABEL);
      const hint = element.querySelector(`#${box.getAttribute('aria-describedby')}`);

      expect(box.type).toBe('checkbox');
      expect(box.checked).toBe(true);
      expect(hint?.textContent).toContain('nunca el contenido de tus facturas');
    });

    it('turns the counters off and on from the checkbox', async () => {
      check(LABEL, false);
      await fixture.whenStable();
      expect(usage.setEnabled).toHaveBeenLastCalledWith(false);
      expect(control(LABEL).checked).toBe(false);

      check(LABEL, true);
      await fixture.whenStable();
      expect(usage.setEnabled).toHaveBeenLastCalledWith(true);
    });

    it('shows the counters off when they are off, as with Global Privacy Control', async () => {
      usageEnabled.set(false);
      await fixture.whenStable();

      expect(control(LABEL).checked).toBe(false);
    });
  });
});
