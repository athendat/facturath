import { Service, inject } from '@angular/core';
import { InMemoryAssetStore } from './in-memory-asset-store';
import { requestToPromise, transactionDone } from './indexed-db';
import { ASSETS_STORE, IndexedDbConnection } from './indexed-db-connection';
import type { AssetStore } from './ports';

/**
 * An image as stored: its bytes and MIME type rather than the Blob itself,
 * which every IndexedDB implementation clones reliably.
 */
interface AssetRecord {
  id: string;
  type: string;
  bytes: ArrayBuffer;
}

/**
 * Images in IndexedDB. Delegates to the open database, or to the in-memory
 * twin for the session when it could not be opened.
 */
@Service()
export class IndexedDbAssetStore implements AssetStore {
  private readonly connection = inject(IndexedDbConnection);
  private readonly backend: Promise<AssetStore> = this.connection
    .open()
    .then((database) => (database ? new DatabaseAssetStore(database) : new InMemoryAssetStore()));

  async put(id: string, blob: Blob): Promise<void> {
    return (await this.backend).put(id, blob);
  }

  async get(id: string): Promise<Blob | null> {
    return (await this.backend).get(id);
  }

  async delete(id: string): Promise<void> {
    return (await this.backend).delete(id);
  }
}

/** The asset store over an open database. */
class DatabaseAssetStore implements AssetStore {
  constructor(private readonly database: IDBDatabase) {}

  async put(id: string, blob: Blob): Promise<void> {
    const record: AssetRecord = { id, type: blob.type, bytes: await blob.arrayBuffer() };
    const transaction = this.database.transaction(ASSETS_STORE, 'readwrite');
    transaction.objectStore(ASSETS_STORE).put(record);
    await transactionDone(transaction);
  }

  async get(id: string): Promise<Blob | null> {
    const record = await requestToPromise<AssetRecord | undefined>(
      this.database.transaction(ASSETS_STORE).objectStore(ASSETS_STORE).get(id),
    );
    return record ? new Blob([record.bytes], { type: record.type }) : null;
  }

  async delete(id: string): Promise<void> {
    const transaction = this.database.transaction(ASSETS_STORE, 'readwrite');
    transaction.objectStore(ASSETS_STORE).delete(id);
    await transactionDone(transaction);
  }
}
