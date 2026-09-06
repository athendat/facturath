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

/** Images in IndexedDB. Falls back to the in-memory twin when the connection could not be opened. */
@Service()
export class IndexedDbAssetStore implements AssetStore {
  private readonly connection = inject(IndexedDbConnection);
  private readonly memory = new InMemoryAssetStore();

  async put(id: string, blob: Blob): Promise<void> {
    const database = await this.connection.database();
    if (!database) {
      return this.memory.put(id, blob);
    }
    const record: AssetRecord = { id, type: blob.type, bytes: await blob.arrayBuffer() };
    const transaction = database.transaction(ASSETS_STORE, 'readwrite');
    transaction.objectStore(ASSETS_STORE).put(record);
    await transactionDone(transaction);
  }

  async get(id: string): Promise<Blob | null> {
    const database = await this.connection.database();
    if (!database) {
      return this.memory.get(id);
    }
    const record = await requestToPromise<AssetRecord | undefined>(
      database.transaction(ASSETS_STORE).objectStore(ASSETS_STORE).get(id),
    );
    return record ? new Blob([record.bytes], { type: record.type }) : null;
  }

  async delete(id: string): Promise<void> {
    const database = await this.connection.database();
    if (!database) {
      return this.memory.delete(id);
    }
    const transaction = database.transaction(ASSETS_STORE, 'readwrite');
    transaction.objectStore(ASSETS_STORE).delete(id);
    await transactionDone(transaction);
  }
}
