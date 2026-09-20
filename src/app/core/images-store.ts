import { PendingTasks, Service, computed, inject, signal, type OnDestroy } from '@angular/core';
import { IMAGE_ASSET_FIELDS, IMAGE_KINDS, type ImageKind } from '../domain/invoice';
import { ObjectUrls } from './object-urls';
import { SettingsStore } from './settings-store';
import { ASSET_STORE } from './storage/ports';
import { StorageStatus } from './storage/storage-status';

export type ImageUrls = Record<ImageKind, string | null>;

/**
 * The seller's logo and payment QR codes: their blobs live in the asset store
 * and this store hands out an object URL per asset id. The settings panel
 * reads the profile's images by kind (`urls`); the document reads the open
 * invoice's own ids through `urlFor`, since a loaded or imported invoice may
 * point at images the profile does not.
 */
@Service()
export class ImagesStore implements OnDestroy {
  private readonly assets = inject(ASSET_STORE);
  private readonly settings = inject(SettingsStore);
  private readonly objectUrls = inject(ObjectUrls);
  private readonly status = inject(StorageStatus);
  private readonly pendingTasks = inject(PendingTasks);
  /** Object URL per asset id whose blob is displayed. */
  private readonly byId = signal<ReadonlyMap<string, string>>(new Map());
  /** Ids whose blob is being fetched, so none is fetched twice. */
  private readonly fetching = new Set<string>();
  private loading: Promise<void> | null = null;

  /** The profile's images, an object URL per kind or null where there is none. */
  readonly urls = computed<ImageUrls>(() => {
    const profile = this.settings.profile();
    const byId = this.byId();
    return Object.fromEntries(
      IMAGE_KINDS.map((kind) => {
        const id = profile[IMAGE_ASSET_FIELDS[kind]];
        return [kind, id === null ? null : (byId.get(id) ?? null)];
      }),
    ) as ImageUrls;
  });

  /** The object URL of asset `id` once `resolve`d, or null while missing or for no id. */
  urlFor(id: string | null): string | null {
    return id === null ? null : (this.byId().get(id) ?? null);
  }

  /**
   * Fetches the blob of `id` and displays it, once; browser only. A missing blob
   * leaves its placeholder. Runs as a pending task so the app is not stable until
   * the image shows. Call from an effect, never from a template.
   */
  resolve(id: string | null): void {
    if (id === null || this.byId().has(id) || this.fetching.has(id)) {
      return;
    }
    this.fetching.add(id);
    const done = this.pendingTasks.add();
    this.assets
      .get(id)
      .then((blob) => {
        if (blob !== null && !this.byId().has(id)) {
          this.display(id, this.objectUrls.create(blob));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        this.fetching.delete(id);
        done();
      });
  }

  /**
   * Shows the images the profile points at; browser only, after hydration and
   * once the profile is loaded. An image chosen while its blob was still loading
   * wins over the remembered one.
   */
  load(): Promise<void> {
    this.loading ??= Promise.all(
      IMAGE_KINDS.map(async (kind) => {
        const field = IMAGE_ASSET_FIELDS[kind];
        const id = this.settings.profile()[field];
        if (id === null || this.byId().has(id)) {
          return;
        }
        const blob = await this.assets.get(id);
        if (blob !== null && this.settings.profile()[field] === id && !this.byId().has(id)) {
          this.display(id, this.objectUrls.create(blob));
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  /** Shows the images the profile points at now: for when the profile is replaced at once. */
  reload(): Promise<void> {
    this.loading = null;
    return this.load();
  }

  /**
   * Stores `blob` as the new image of `kind` and shows it. The document and the
   * profile change right away; a store that cannot write only disables saving.
   */
  async set(kind: ImageKind, blob: Blob): Promise<void> {
    const field = IMAGE_ASSET_FIELDS[kind];
    const previousId = this.settings.profile()[field];
    const id = crypto.randomUUID();
    this.display(id, this.objectUrls.create(blob));
    this.settings.setAssetId(field, id);
    if (previousId !== null) {
      this.forget(previousId);
    }
    await this.persist(async () => {
      await this.assets.put(id, blob);
      if (previousId !== null) {
        await this.assets.delete(previousId);
      }
    });
  }

  /** Forgets the image of `kind`: the placeholder returns and the asset is deleted. */
  async remove(kind: ImageKind): Promise<void> {
    const field = IMAGE_ASSET_FIELDS[kind];
    const id = this.settings.profile()[field];
    this.settings.setAssetId(field, null);
    if (id !== null) {
      this.forget(id);
      await this.persist(() => this.assets.delete(id));
    }
  }

  ngOnDestroy(): void {
    for (const id of Array.from(this.byId().keys())) {
      this.forget(id);
    }
  }

  private display(id: string, url: string): void {
    this.byId.update((byId) => new Map(byId).set(id, url));
  }

  /** Stops displaying `id`, revoking its URL. */
  private forget(id: string): void {
    const url = this.byId().get(id);
    if (url === undefined) {
      return;
    }
    this.byId.update((byId) => {
      const next = new Map(byId);
      next.delete(id);
      return next;
    });
    this.objectUrls.revoke(url);
  }

  /** Runs a write against the asset store; a failure never reaches the UI beyond the notice. */
  private async persist(write: () => Promise<void>): Promise<void> {
    try {
      await write();
    } catch {
      this.status.markUnavailable();
    }
  }
}
