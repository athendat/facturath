import type { ObjectUrls } from '../object-urls';

/** Hands out `blob:fake/<n>` URLs and remembers which ones were revoked. */
export class FakeObjectUrls implements Pick<ObjectUrls, 'create' | 'revoke'> {
  private next = 1;
  /** Every URL created so far, in order. */
  readonly created: string[] = [];
  /** Every URL revoked so far, in order. */
  readonly revoked: string[] = [];

  create(_blob: Blob): string {
    const url = `blob:fake/${this.next++}`;
    this.created.push(url);
    return url;
  }

  revoke(url: string): void {
    this.revoked.push(url);
  }
}
