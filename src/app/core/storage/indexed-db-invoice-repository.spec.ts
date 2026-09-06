import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IDBFactory } from 'fake-indexeddb';
import { createInvoice, type Invoice } from '../../domain/invoice';
import {
  provideFakeIndexedDb,
  provideIndexedDbFactory,
  provideNoIndexedDb,
} from '../testing/fake-storage';
import { IndexedDbConnection } from './indexed-db-connection';
import { IndexedDbInvoiceRepository } from './indexed-db-invoice-repository';
import { InMemoryInvoiceRepository } from './in-memory-invoice-repository';
import type { InvoiceRepository } from './ports';
import { StorageStatus } from './storage-status';

function invoice(
  id: string,
  series: string,
  number: string,
  issueDate: string,
  buyerName = '',
): Invoice {
  const built = createInvoice(id);
  built.series = series;
  built.number = number;
  built.issueDate = issueDate;
  built.buyer.name = buyerName;
  built.lines[0].quantity = '2';
  built.lines[0].unitPrice = '10.50';
  return built;
}

/** The same expectations run against the IndexedDB adapter and its in-memory twin. */
function describeRepositoryContract(name: string, create: () => InvoiceRepository): void {
  describe(name, () => {
    let repository: InvoiceRepository;

    beforeEach(() => {
      repository = create();
    });

    it('has nothing stored at first', async () => {
      await expect(repository.get('missing')).resolves.toBeNull();
      await expect(repository.listSummaries()).resolves.toEqual([]);
      await expect(repository.getDraft()).resolves.toBeNull();
    });

    it('returns a saved invoice by id, equal to what was stored', async () => {
      const saved = invoice('inv-1', 'A', '0001', '2026-09-01', 'Ana Pérez');

      const returned = await repository.save(saved);

      expect(returned).toEqual(saved);
      await expect(repository.get('inv-1')).resolves.toEqual(saved);
    });

    it('lists summaries newest first by issue date, then by number', async () => {
      await repository.save(invoice('inv-1', 'A', '0001', '2026-09-01', 'Ana Pérez'));
      await repository.save(invoice('inv-2', 'A', '0003', '2026-09-02'));
      await repository.save(invoice('inv-3', 'B', '0002', '2026-09-02', 'Luis Gómez'));

      await expect(repository.listSummaries()).resolves.toEqual([
        {
          id: 'inv-2',
          series: 'A',
          number: '0003',
          issueDate: '2026-09-02',
          buyerName: '',
          currency: 'CUP',
          total: 2100,
        },
        {
          id: 'inv-3',
          series: 'B',
          number: '0002',
          issueDate: '2026-09-02',
          buyerName: 'Luis Gómez',
          currency: 'CUP',
          total: 2100,
        },
        {
          id: 'inv-1',
          series: 'A',
          number: '0001',
          issueDate: '2026-09-01',
          buyerName: 'Ana Pérez',
          currency: 'CUP',
          total: 2100,
        },
      ]);
    });

    it('replaces the invoice that already has the same series and number', async () => {
      await repository.save(invoice('inv-1', 'A', '0001', '2026-09-01'));
      await repository.save(invoice('inv-2', 'B', '0001', '2026-09-01'));

      await repository.save(invoice('inv-9', 'A', '0001', '2026-09-03', 'Ana Pérez'));

      await expect(repository.get('inv-1')).resolves.toBeNull();
      const summaries = await repository.listSummaries();
      expect(summaries.map((summary) => summary.id)).toEqual(['inv-9', 'inv-2']);
    });

    it('updates an invoice saved again under the same id', async () => {
      await repository.save(invoice('inv-1', 'A', '0001', '2026-09-01'));

      await repository.save(invoice('inv-1', 'A', '0007', '2026-09-05', 'Ana Pérez'));

      const summaries = await repository.listSummaries();
      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatchObject({ id: 'inv-1', number: '0007', buyerName: 'Ana Pérez' });
    });

    it('deletes by id and tolerates unknown ids', async () => {
      await repository.save(invoice('inv-1', 'A', '0001', '2026-09-01'));

      await repository.delete('inv-1');
      await repository.delete('inv-1');

      await expect(repository.get('inv-1')).resolves.toBeNull();
      await expect(repository.listSummaries()).resolves.toEqual([]);
    });

    it('keeps one draft apart from the saved invoices', async () => {
      await repository.save(invoice('inv-1', 'A', '0001', '2026-09-01'));
      await repository.saveDraft(invoice('draft-1', 'A', '0001', '2026-09-02'));
      await repository.saveDraft(invoice('draft-2', 'A', '0002', '2026-09-02', 'Ana Pérez'));

      const draft = await repository.getDraft();

      expect(draft?.id).toBe('draft-2');
      expect(draft?.buyer.name).toBe('Ana Pérez');
      await expect(repository.get('inv-1')).resolves.not.toBeNull();
      const summaries = await repository.listSummaries();
      expect(summaries.map((summary) => summary.id)).toEqual(['inv-1']);
    });
  });
}

describe('invoice repositories', () => {
  describeRepositoryContract('IndexedDbInvoiceRepository', () => {
    TestBed.configureTestingModule({ providers: [provideFakeIndexedDb()] });
    return TestBed.inject(IndexedDbInvoiceRepository);
  });

  describeRepositoryContract('InMemoryInvoiceRepository', () => new InMemoryInvoiceRepository());

  describe('IndexedDbInvoiceRepository persistence', () => {
    it('sees the invoices a previous connection to the same database stored', async () => {
      const factory = new IDBFactory();
      TestBed.configureTestingModule({ providers: [provideFakeIndexedDb(factory)] });
      await TestBed.inject(IndexedDbInvoiceRepository).save(
        invoice('inv-1', 'A', '0001', '2026-09-01'),
      );
      (await TestBed.inject(IndexedDbConnection).open())?.close();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideFakeIndexedDb(factory)] });
      const reopened: IndexedDbInvoiceRepository = TestBed.inject(IndexedDbInvoiceRepository);

      await expect(reopened.get('inv-1')).resolves.toMatchObject({ id: 'inv-1' });
      expect(TestBed.inject(StorageStatus).savingDisabled()).toBe(false);
    });
  });

  describe('IndexedDbInvoiceRepository without a usable IndexedDB', () => {
    function repositoryWith(provider: Provider): {
      repository: IndexedDbInvoiceRepository;
      status: StorageStatus;
    } {
      TestBed.configureTestingModule({ providers: [provider] });
      return {
        repository: TestBed.inject(IndexedDbInvoiceRepository),
        status: TestBed.inject(StorageStatus),
      };
    }

    it('reports that saving is disabled and works in memory when indexedDB is missing', async () => {
      const { repository, status } = repositoryWith(provideNoIndexedDb());

      await repository.save(invoice('inv-1', 'A', '0001', '2026-09-01'));

      expect(status.savingDisabled()).toBe(true);
      await expect(repository.get('inv-1')).resolves.toMatchObject({ id: 'inv-1' });
    });

    it('reports that saving is disabled and works in memory when open throws', async () => {
      const throwing = {
        open: () => {
          throw new DOMException(
            'A mutation operation was attempted on a database that did not allow mutations.',
            'InvalidStateError',
          );
        },
      } as unknown as IDBFactory;
      const { repository, status } = repositoryWith(provideIndexedDbFactory(throwing));

      await repository.save(invoice('inv-1', 'A', '0001', '2026-09-01'));

      expect(status.savingDisabled()).toBe(true);
      await expect(repository.listSummaries()).resolves.toHaveLength(1);
    });

    it('reports that saving is disabled and works in memory when the open request fails', async () => {
      const failing = {
        open: () => {
          const request = { error: new DOMException('Blocked', 'UnknownError') } as {
            error: DOMException;
            onerror?: (event: Event) => void;
          };
          setTimeout(() => request.onerror?.(new Event('error')));
          return request;
        },
      } as unknown as IDBFactory;
      const { repository, status } = repositoryWith(provideIndexedDbFactory(failing));

      await repository.saveDraft(invoice('draft-1', 'A', '0001', '2026-09-01'));

      expect(status.savingDisabled()).toBe(true);
      await expect(repository.getDraft()).resolves.toMatchObject({ id: 'draft-1' });
    });
  });
});
