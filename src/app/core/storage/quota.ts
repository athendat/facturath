/** What every store tells the user when the origin has run out of storage. */
export const QUOTA_FULL_MESSAGE = 'No hay espacio para guardar. Exporta y elimina facturas antiguas.';

/** IndexedDB rejects with this DOMException when the origin has run out of storage. */
export function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}
