import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { App } from './app';
import { ImagesStore } from './core/images-store';
import { ObjectUrls } from './core/object-urls';
import { findButton, findByText } from './core/testing/dom';
import { FakeObjectUrls } from './core/testing/fake-object-urls';
import { FakeSwUpdate } from './core/testing/fake-sw-update';
import { IMAGE_KINDS } from './domain/invoice';

/**
 * Criterion 2 of #15: every inline field, icon button and upload control has an
 * accessible name. axe only reports a missing name on the rules it knows about,
 * so this walks every focusable element itself, in every panel state.
 */

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The accessible name of `element`, following the parts of accname that this app
 * uses: aria-labelledby, aria-label, an associated or wrapping label, then the
 * element's own text (with an image's alt standing in for the image).
 */
function accessibleName(element: Element): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const named = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim() ?? '')
      .join(' ');
    if (named.trim()) {
      return named.trim();
    }
  }

  const label = element.getAttribute('aria-label')?.trim();
  if (label) {
    return label;
  }

  const id = element.getAttribute('id');
  const associated = id
    ? Array.from(element.ownerDocument.querySelectorAll('label[for]')).find(
        (candidate) => candidate.getAttribute('for') === id,
      )
    : undefined;
  const wrapping = element.closest('label');
  const fromLabel = (associated ?? wrapping)?.textContent?.trim();
  if (fromLabel) {
    return fromLabel;
  }

  const own = element.textContent?.trim();
  if (own) {
    return own;
  }

  const alt = Array.from(element.querySelectorAll('img'))
    .map((image) => image.getAttribute('alt')?.trim() ?? '')
    .join(' ')
    .trim();
  return alt || element.getAttribute('title')?.trim() || '';
}

function describeElement(element: Element): string {
  const attributes = Array.from(element.attributes)
    .filter(({ name }) => name === 'class' || name === 'type' || name === 'id')
    .map(({ name, value }) => `${name}="${value}"`)
    .join(' ');
  return `<${element.tagName.toLowerCase()}${attributes ? ` ${attributes}` : ''}>`;
}

describe('App accessible names', () => {
  let fixture: ComponentFixture<App>;
  let compiled: HTMLElement;

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
    compiled = fixture.nativeElement as HTMLElement;
  });

  /** Focusable elements with no accessible name, described so a failure names the culprit. */
  function unnamed(): string[] {
    const controls = Array.from(compiled.querySelectorAll(FOCUSABLE));
    // Guards against a silent pass if the app ever renders nothing focusable.
    expect(controls.length).toBeGreaterThan(10);
    return controls.filter((control) => accessibleName(control) === '').map(describeElement);
  }

  function duplicateIds(): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const element of Array.from(compiled.querySelectorAll('[id]'))) {
      const id = element.id;
      if (seen.has(id)) {
        duplicates.add(id);
      }
      seen.add(id);
    }
    return [...duplicates];
  }

  async function openMore(): Promise<void> {
    compiled.querySelector<HTMLButtonElement>('.app-header button[aria-haspopup="menu"]')?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[role="menu"]')).not.toBeNull();
  }

  /** Opens a panel from the item of the Más menu whose visible text is `item`. */
  async function open(item: string): Promise<void> {
    await openMore();
    findByText(compiled, '[role="menuitem"]', item)?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[role="dialog"]')).not.toBeNull();
  }

  it('names every control of the editor', () => {
    expect(unnamed()).toEqual([]);
  });

  it('gives every element a unique id', () => {
    expect(duplicateIds()).toEqual([]);
  });

  it('names every control once the images are set', async () => {
    const images = TestBed.inject(ImagesStore);
    for (const kind of IMAGE_KINDS) {
      await images.set(kind, new Blob(['png'], { type: 'image/png' }));
    }
    await fixture.whenStable();
    // The remove buttons only exist while an image is set.
    expect(compiled.querySelectorAll('button[aria-label^="Quitar"]')).toHaveLength(3);

    expect(unnamed()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
  });

  it('names every control with the Más menu open', async () => {
    await openMore();

    expect(unnamed()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
  });

  it('names every control with the phone menu open', async () => {
    compiled.querySelector<HTMLButtonElement>('.app-header .hamburger')?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('[role="dialog"]')).not.toBeNull();

    expect(unnamed()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
  });

  it('names every control of the saved invoices drawer', async () => {
    findButton(compiled, 'Guardar')?.click();
    await fixture.whenStable();
    await open('Facturas guardadas 1');
    expect(compiled.querySelector('[role="dialog"] li')).not.toBeNull();

    expect(unnamed()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
  });

  it('names every control of the settings panel', async () => {
    await open('Ajustes');

    expect(unnamed()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
  });

  it('names every control of the file panel', async () => {
    await open('Exportar / importar');
    expect(compiled.querySelectorAll('[role="dialog"] input[type="file"]')).toHaveLength(2);

    expect(unnamed()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
  });

  it('names every control of the compliance panel', async () => {
    compiled.querySelector<HTMLButtonElement>('app-compliance-seal button')?.click();
    await fixture.whenStable();
    expect(compiled.querySelectorAll('[role="dialog"] li')).toHaveLength(13);

    expect(unnamed()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
  });
});
