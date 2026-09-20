import { Component, inject, model } from '@angular/core';
import { ImagesStore } from '../../core/images-store';
import { SettingsStore } from '../../core/settings-store';
import type { ImageKind } from '../../domain/invoice';
import type { Density, SectionFlag } from '../../domain/preferences';
import type { ProfileTextField } from '../../domain/seller-profile';
import { Drawer } from '../../shared/ui/drawer';
import { ImageControl } from '../../shared/ui/image-control';

interface Labelled<T> {
  value: T;
  label: string;
}

const PROFILE_FIELDS: Labelled<ProfileTextField>[] = [
  { value: 'name', label: 'Nombre o razón social' },
  { value: 'address', label: 'Dirección' },
  { value: 'nit', label: 'NIT' },
  { value: 'commercialRegistry', label: 'Registro comercial' },
  { value: 'bankAccount', label: 'Cuenta bancaria' },
  { value: 'bankBranch', label: 'Sucursal bancaria' },
];

const IMAGES: Labelled<ImageKind>[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'transfermovilQr', label: 'QR Transfermóvil' },
  { value: 'enzonaQr', label: 'QR EnZona' },
];

const DENSITY_OPTIONS: Labelled<Density>[] = [
  { value: 'compact', label: 'Compacta' },
  { value: 'spacious', label: 'Espaciosa' },
];

const SECTIONS: Labelled<SectionFlag>[] = [
  { value: 'showCarrier', label: 'Mostrar transportista' },
  { value: 'showSignatures', label: 'Mostrar firmas' },
  { value: 'showPaymentQr', label: 'Mostrar QR de pago' },
];

let nextId = 0;

/**
 * Everything about the seller in one side panel: the profile fields, the
 * images and the layout preferences. A shortcut: the document stays editable
 * and the two follow each other through the settings store.
 */
@Component({
  selector: 'app-settings-panel',
  imports: [Drawer, ImageControl],
  template: `
    <app-drawer [(open)]="open" heading="Ajustes">
      <section class="group" [attr.aria-labelledby]="id + '-issuer'">
        <h3 class="title" [id]="id + '-issuer'">Datos del emisor</h3>
        @for (field of profileFields; track field.value) {
          <div class="field">
            <label class="label" [for]="id + '-' + field.value">{{ field.label }}</label>
            <input
              class="input"
              type="text"
              autocomplete="off"
              [id]="id + '-' + field.value"
              [value]="settings.profile()[field.value]"
              (input)="onProfileInput(field.value, $event)"
            />
          </div>
        }
      </section>

      <section class="group" [attr.aria-labelledby]="id + '-images'">
        <h3 class="title" [id]="id + '-images'">Imágenes</h3>
        <div class="images">
          @for (image of images; track image.value) {
            <div class="image">
              <span class="label">{{ image.label }}</span>
              <app-image-control
                [kind]="image.value"
                [url]="imagesStore.urls()[image.value]"
                (fileChosen)="imagesStore.set(image.value, $event)"
                (removed)="imagesStore.remove(image.value)"
              />
            </div>
          }
        </div>
      </section>

      <section class="group" [attr.aria-labelledby]="id + '-layout'">
        <h3 class="title" [id]="id + '-layout'">Diseño</h3>
        <fieldset class="fieldset">
          <legend class="legend">Densidad</legend>
          @for (option of densityOptions; track option.value) {
            <label class="choice">
              <input
                type="radio"
                [attr.name]="id + '-density'"
                [value]="option.value"
                [checked]="settings.density() === option.value"
                (change)="settings.setDensity(option.value)"
              />
              {{ option.label }}
            </label>
          }
        </fieldset>
        <fieldset class="fieldset">
          <legend class="legend">Secciones</legend>
          @for (section of sections; track section.value) {
            <label class="choice">
              <input
                type="checkbox"
                [checked]="settings.preferences()[section.value]"
                (change)="onSectionChange(section.value, $event)"
              />
              {{ section.label }}
            </label>
          }
        </fieldset>
      </section>
    </app-drawer>
  `,
  styles: `
    .group + .group {
      margin-top: var(--sp-5);
      padding-top: var(--sp-4);
      border-top: 1px solid var(--border-1);
    }

    .title {
      margin: 0 0 var(--sp-3);
      font-size: var(--fs-14);
      font-weight: var(--fw-bold);
    }

    .field + .field {
      margin-top: var(--sp-3);
    }

    .label {
      display: block;
      margin-bottom: 3px;
      color: var(--fg-2);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
    }

    .input {
      display: block;
      width: 100%;
      min-height: 36px;
      padding: 0 var(--sp-2);
      border: 1px solid var(--border-2);
      border-radius: var(--radius-xs);
      background: var(--bg-0);
      font-size: var(--fs-14);
    }

    .input:focus {
      border-color: var(--border-focus);
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .images {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-4);
    }

    .image {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--sp-1);
    }

    .fieldset {
      margin: 0;
      padding: 0;
      border: 0;
    }

    .fieldset + .fieldset {
      margin-top: var(--sp-3);
    }

    .legend {
      padding: 0;
      margin-bottom: var(--sp-1);
      color: var(--fg-2);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
    }

    .choice {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      min-height: 32px;
      font-size: var(--fs-14);
      cursor: pointer;
    }

    .choice input {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: var(--gem-900);
    }

    .choice input:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }
  `,
  host: { 'data-print-hide': '' },
})
export class SettingsPanel {
  protected readonly settings = inject(SettingsStore);
  protected readonly imagesStore = inject(ImagesStore);

  readonly open = model(false);

  protected readonly id = `settings-${nextId++}`;
  protected readonly profileFields = PROFILE_FIELDS;
  protected readonly images = IMAGES;
  protected readonly densityOptions = DENSITY_OPTIONS;
  protected readonly sections = SECTIONS;

  protected onProfileInput(field: ProfileTextField, event: Event): void {
    this.settings.updateProfile(field, (event.target as HTMLInputElement).value);
  }

  protected onSectionChange(flag: SectionFlag, event: Event): void {
    this.settings.setSection(flag, (event.target as HTMLInputElement).checked);
  }
}
