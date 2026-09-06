import { Component, computed, inject, input } from '@angular/core';
import { ImagesStore, type ImageKind } from '../../core/images-store';

interface ImageLayout {
  /** Accessible name of the image once set. */
  name: string;
  /** Accessible name of the file control. */
  upload: string;
  /** Text of the empty box. */
  placeholder: string;
  /** Accessible name of the remove button. */
  remove: string;
  /** Printed under the image, or nothing. */
  caption: string | null;
  /** Side of the square box in px. */
  size: number;
}

const LAYOUTS: Record<ImageKind, ImageLayout> = {
  logo: {
    name: 'Logo',
    upload: 'Subir logo',
    placeholder: 'Subir logo',
    remove: 'Quitar logo',
    caption: null,
    size: 64,
  },
  transfermovilQr: {
    name: 'QR Transfermóvil',
    upload: 'Subir QR de Transfermóvil',
    placeholder: 'Subir QR Transfermóvil',
    remove: 'Quitar QR de Transfermóvil',
    caption: 'Transfermóvil',
    size: 72,
  },
  enzonaQr: {
    name: 'QR EnZona',
    upload: 'Subir QR de EnZona',
    placeholder: 'Subir QR EnZona',
    remove: 'Quitar QR de EnZona',
    caption: 'EnZona',
    size: 72,
  },
};

/**
 * One of the seller's images: a file control shown as the image when set and
 * as a dashed upload box when not. The whole control is hidden in print while
 * empty; a set image prints with exact colours so QR codes stay scannable.
 */
@Component({
  selector: 'app-image-control',
  template: `
    <label class="pick">
      <input
        type="file"
        accept="image/*"
        class="file"
        [attr.aria-label]="layout().upload"
        (change)="onFileChosen($event)"
      />
      @if (url(); as src) {
        <!-- A user-uploaded blob: URL; NgOptimizedImage is for static, optimizable sources. -->
        <img class="image" [src]="src" [alt]="layout().name" />
      } @else {
        <span class="placeholder">{{ layout().placeholder }}</span>
      }
    </label>
    @if (url() !== null) {
      <button
        type="button"
        class="remove"
        data-print-hide
        [attr.aria-label]="layout().remove"
        (click)="images.remove(kind())"
      >
        <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" focusable="false">
          <path
            d="M3.5 2.4 8 6.9l4.5-4.5 1.1 1.1L9.1 8l4.5 4.5-1.1 1.1L8 9.1l-4.5 4.5-1.1-1.1L6.9 8 2.4 3.5z"
            fill="currentColor"
          />
        </svg>
      </button>
    }
    @if (layout().caption; as caption) {
      <span class="caption">{{ caption }}</span>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: flex;
      flex: none;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .pick {
      position: relative;
      display: block;
      width: var(--size);
      height: var(--size);
      cursor: pointer;
    }

    .pick:focus-within {
      box-shadow: var(--focus-ring);
    }

    /* Visually hidden; the label is the visible control. */
    .file {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    .image {
      display: block;
      width: 100%;
      height: 100%;
      border: 1px solid var(--border-1);
      object-fit: contain;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .placeholder {
      display: flex;
      width: 100%;
      height: 100%;
      padding: var(--sp-1);
      border: 1px dashed var(--border-2);
      align-items: center;
      justify-content: center;
      color: var(--fg-4);
      font-size: 9px;
      line-height: 1.3;
    }

    .pick:hover .placeholder {
      background: var(--gray-100);
    }

    .remove {
      position: absolute;
      top: -6px;
      right: -6px;
      display: inline-flex;
      padding: 3px;
      border: 1px solid var(--border-1);
      border-radius: var(--radius-full);
      background: var(--bg-0);
      color: var(--fg-3);
      cursor: pointer;
    }

    .remove:hover {
      background: var(--danger-bg);
      color: var(--danger-fg);
    }

    .remove:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .caption {
      margin-top: 3px;
      color: var(--fg-2);
      font-size: 9px;
      font-weight: var(--fw-bold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  `,
  host: {
    '[style.--size.px]': 'layout().size',
    '[attr.data-print-hide]': 'url() === null ? "" : null',
  },
})
export class ImageControl {
  protected readonly images = inject(ImagesStore);
  readonly kind = input.required<ImageKind>();

  protected readonly layout = computed(() => LAYOUTS[this.kind()]);
  protected readonly url = computed(() => this.images.urls()[this.kind()]);

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.images.set(this.kind(), file);
    }
    // So choosing the same file again after removing it fires `change`.
    input.value = '';
  }
}
