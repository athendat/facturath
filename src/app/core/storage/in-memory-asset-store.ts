import type { AssetStore } from './ports';

/** Holds blobs for the session only: the test fake and the fallback when IndexedDB is unavailable. */
export class InMemoryAssetStore implements AssetStore {
  private readonly blobs = new Map<string, Blob>();

  put(id: string, blob: Blob): Promise<void> {
    this.blobs.set(id, blob);
    return Promise.resolve();
  }

  get(id: string): Promise<Blob | null> {
    return Promise.resolve(this.blobs.get(id) ?? null);
  }

  delete(id: string): Promise<void> {
    this.blobs.delete(id);
    return Promise.resolve();
  }
}
