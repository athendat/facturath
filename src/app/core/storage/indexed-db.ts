/**
 * The smallest promise wrapper over IndexedDB the adapters need: open with
 * upgrade, request to promise, and transaction completion. Written in-project
 * instead of pulling a library.
 */

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/** Resolves once every request in the transaction has been committed. */
export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/**
 * Opens (creating or upgrading through `upgrade`) the database. Rejects when
 * the browser refuses. A `blocked` event (another tab still holds an older
 * version) is not terminal: the open still succeeds or fails afterwards, so
 * only those two events settle the promise.
 */
export function openDatabase(
  factory: IDBFactory,
  name: string,
  version: number,
  upgrade: (database: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}
