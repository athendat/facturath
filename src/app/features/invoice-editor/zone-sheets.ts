import { Service, signal } from '@angular/core';
import type { ZoneKey } from './zones';

/** Which zone of the phone document has its bottom sheet open, if any (#64). */
@Service()
export class ZoneSheets {
  private readonly openZone = signal<ZoneKey | null>(null);

  readonly current = this.openZone.asReadonly();

  open(zone: ZoneKey): void {
    this.openZone.set(zone);
  }

  close(): void {
    this.openZone.set(null);
  }
}
