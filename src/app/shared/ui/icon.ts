import { Component, computed, input } from '@angular/core';

/** The 24x24 stroke paths of the few icons the app draws, so no icon library ships. */
const PATHS = {
  save: 'M12 3v11m0 0-4-4m4 4 4-4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
  new: 'M12 5v14M5 12h14',
  list: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
  file: 'M7 20V5m0 0L4 8m3-3 3 3M17 4v15m0 0-3-3m3 3 3-3',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M17 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0M11 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  print:
    'M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'm6 9 6 6 6-6',
  check: 'm5 12 5 5 9-10',
} as const;

export type IconName = keyof typeof PATHS;

/**
 * A 16px line icon in the text colour. Always decorative: the control it sits in
 * carries the name, so the icon is hidden from assistive technology.
 */
@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      width: 16px;
      height: 16px;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => PATHS[this.name()]);
}
