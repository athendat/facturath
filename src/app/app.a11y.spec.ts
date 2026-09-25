import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import axe from 'axe-core';
import { App } from './app';
import { ImagesStore } from './core/images-store';
import { ObjectUrls } from './core/object-urls';
import { StorageStatus } from './core/storage/storage-status';
import { findButton, findByText } from './core/testing/dom';
import { FakeObjectUrls } from './core/testing/fake-object-urls';
import { FakeSwUpdate } from './core/testing/fake-sw-update';
import { IMAGE_KINDS } from './domain/invoice';

describe('App accessibility', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SwUpdate, useValue: new FakeSwUpdate() },
        { provide: ObjectUrls, useValue: new FakeObjectUrls() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  /** Opens the Más menu and chooses the item whose visible text is `item`. */
  async function choose(item: string): Promise<void> {
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.app-header button[aria-haspopup="menu"]')?.click();
    await fixture.whenStable();
    findByText(compiled, '[role="menuitem"]', item)?.click();
    await fixture.whenStable();
  }

  async function violations(): Promise<string[]> {
    // jsdom has no layout engine, so it cannot compute contrast; every other rule runs.
    const results = await axe.run(fixture.nativeElement as HTMLElement, {
      rules: { 'color-contrast': { enabled: false } },
    });
    // Guards against a silent no-op: an empty violation list only counts if rules actually ran.
    expect(results.passes.length).toBeGreaterThan(10);
    return results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.help}\n` +
        violation.nodes.map((node) => `  ${node.target.join(' ')}`).join('\n'),
    );
  }

  it('passes axe with no violations', async () => {
    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  // axe only reports page-has-heading-one against a whole document, which the jsdom run
  // above cannot do; a real-browser run on the built app found the page had no h1 (#15).
  it('names the page with exactly one level-one heading', () => {
    const headings = (fixture.nativeElement as HTMLElement).querySelectorAll('h1');
    expect(Array.from(headings).map((heading) => heading.textContent?.trim())).toEqual(['Factura']);
  });

  it('passes axe with the saving-disabled notice shown', async () => {
    TestBed.inject(StorageStatus).markUnavailable();
    await fixture.whenStable();

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the Más menu open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const more = compiled.querySelector<HTMLButtonElement>('.app-header button[aria-haspopup="menu"]');
    more?.click();
    await fixture.whenStable();
    expect(more?.getAttribute('aria-expanded')).toBe('true');

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the phone menu open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.app-header .hamburger')?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[role="dialog"] [role="group"]')).not.toBeNull();

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the saved invoices drawer open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    findButton(compiled, 'Guardar')?.click();
    await fixture.whenStable();
    await choose('Facturas guardadas 1');
    expect(compiled.querySelector('[role="dialog"] li')).not.toBeNull();

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the settings panel open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    await choose('Ajustes');
    expect(compiled.querySelector('[role="dialog"] h3')).not.toBeNull();

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the file panel open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    await choose('Exportar / importar');
    expect(compiled.querySelectorAll('[role="dialog"] input[type="file"]')).toHaveLength(2);

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the compliance panel open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('app-compliance-seal button')?.click();
    await fixture.whenStable();
    expect(compiled.querySelectorAll('[role="dialog"] li')).toHaveLength(13);

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the logo and both payment QR codes set', async () => {
    const images = TestBed.inject(ImagesStore);
    for (const kind of IMAGE_KINDS) {
      await images.set(kind, new Blob(['png'], { type: 'image/png' }));
    }
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(3);

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);
});
