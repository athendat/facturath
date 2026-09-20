import { Service, inject, signal, type OnDestroy } from '@angular/core';
import { IMAGE_ASSET_FIELDS, IMAGE_KINDS, type ImageKind } from '../domain/invoice';
import { ObjectUrls } from './object-urls';
import { SettingsStore } from './settings-store';
import { ASSET_STORE } from './storage/ports';
import { StorageStatus } from './storage/storage-status';

export type ImageUrls = Record<ImageKind, string | null>;

const NO_URLS = Object.fromEntries(IMAGE_KINDS.map((kind) => [kind, null])) as ImageUrls;

/**
 * The seller's logo and payment QR codes: their blobs live in the asset store,
 * the profile holds their ids, and this store hands the templates an object
 * URL per image. Shared by the invoice editor and the settings panel.
 */
@Service()
export class ImagesStore implements OnDestroy {
  private readonly assets = inject(ASSET_STORE);
  private readonly settings = inject(SettingsStore);
  private readonly objectUrls = inject(ObjectUrls);
  private readonly status = inject(StorageStatus);
  private readonly state = signal<ImageUrls>(NO_URLS);
  private loading: Promise<void> | null = null;

  /** An object URL per image, or null where there is none. */
  readonly urls = this.state.asReadonly();

  /**
   * Shows the images the profile points at; browser only, after hydration and
   * once the profile is loaded. A missing blob leaves its placeholder, and an
   * image chosen while its blob was still loading wins over the remembered one.
   */
  load(): Promise<void> {
    this.loading ??= Promise.all(
      IMAGE_KINDS.map(async (kind) => {
        const field = IMAGE_ASSET_FIELDS[kind];
        const id = this.settings.profile()[field];
        const blob = id === null ? null : await this.assets.get(id);
        if (blob !== null && this.settings.profile()[field] === id) {
          this.show(kind, this.objectUrls.create(blob));
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  /**
   * Shows the images the profile points at now, dropping what was shown: for when
   * the profile is replaced at once (a restored backup) rather than edited image by image.
   */
  reload(): Promise<void> {
    for (const kind of IMAGE_KINDS) {
      this.show(kind, null);
    }
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
    this.show(kind, this.objectUrls.create(blob));
    this.settings.setAssetId(field, id);
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
    this.show(kind, null);
    this.settings.setAssetId(field, null);
    if (id !== null) {
      await this.persist(() => this.assets.delete(id));
    }
  }

  ngOnDestroy(): void {
    for (const kind of IMAGE_KINDS) {
      this.show(kind, null);
    }
  }

  /** Displays `url` for `kind`, revoking whatever was displayed before. */
  private show(kind: ImageKind, url: string | null): void {
    const previous = this.state()[kind];
    this.state.update((urls) => ({ ...urls, [kind]: url }));
    if (previous !== null) {
      this.objectUrls.revoke(previous);
    }
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
