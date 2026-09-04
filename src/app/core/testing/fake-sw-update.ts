import type { VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

/** Stands in for SwUpdate: tests push version events through `versionUpdates`. */
export class FakeSwUpdate {
  isEnabled = true;
  readonly versionUpdates = new Subject<VersionEvent>();
}

export const versionReady: VersionEvent = {
  type: 'VERSION_READY',
  currentVersion: { hash: 'a' },
  latestVersion: { hash: 'b' },
};
