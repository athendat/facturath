/** Bytes per `btoa` call: `String.fromCharCode` takes its arguments on the stack, so keep it small. */
const CHUNK = 0x8000;

/** The bytes of `blob` as standard base64 (no data URL prefix). */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

/** A blob of MIME `type` holding the bytes `data` encodes; throws on malformed base64. */
export function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type });
}
