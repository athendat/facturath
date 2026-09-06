import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ObjectUrls } from './object-urls';

describe('ObjectUrls', () => {
  const createObjectURL = vi.fn(() => 'blob:https://facturath.test/1');
  const revokeObjectURL = vi.fn();
  let urls: ObjectUrls;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: { defaultView: { URL: { createObjectURL, revokeObjectURL } } },
        },
      ],
    });
    urls = TestBed.inject(ObjectUrls);
  });

  it('creates an object URL for a blob through the window that owns the document', () => {
    const blob = new Blob(['png'], { type: 'image/png' });

    expect(urls.create(blob)).toBe('blob:https://facturath.test/1');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('revokes an object URL through the same window', () => {
    urls.revoke('blob:https://facturath.test/1');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:https://facturath.test/1');
  });
});
