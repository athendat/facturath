import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import axe from 'axe-core';
import { App } from './app';
import { ImagesStore } from './core/images-store';
import { ObjectUrls } from './core/object-urls';
import { StorageStatus } from './core/storage/storage-status';
import { findButton } from './core/testing/dom';
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

  it('passes axe with the saving-disabled notice shown', async () => {
    TestBed.inject(StorageStatus).markUnavailable();
    await fixture.whenStable();

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the saved invoices drawer open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    findButton(compiled, 'Guardar')?.click();
    await fixture.whenStable();
    findButton(compiled, 'Guardadas (1)')?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[role="dialog"] li')).not.toBeNull();

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the settings panel open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    findButton(compiled, 'Ajustes')?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[role="dialog"] h3')).not.toBeNull();

    await expect(violations()).resolves.toEqual([]);
  }, 30_000);

  it('passes axe with the compliance panel open', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    findButton(compiled, 'Res. 55 (11)')?.click();
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
