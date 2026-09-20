import type { FileDownload } from '../file-download';

/** Remembers every file handed to the browser to save, instead of downloading it. */
export class FakeFileDownload implements Pick<FileDownload, 'save'> {
  readonly saved: { name: string; blob: Blob }[] = [];

  save(name: string, blob: Blob): void {
    this.saved.push({ name, blob });
  }

  /** The last file saved, parsed as JSON. */
  async lastJson(): Promise<unknown> {
    const last = this.saved[this.saved.length - 1];
    if (!last) {
      throw new Error('Nothing was saved');
    }
    return JSON.parse(await last.blob.text());
  }
}
