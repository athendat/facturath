import { checkCompliance } from '../../domain/compliance';
import { createInvoice, type Invoice } from '../../domain/invoice';
import { pendingByZone } from './zones';

const ALL_SECTIONS = { showCarrier: true, showSignatures: true };
const NO_SECTIONS = { showCarrier: false, showSignatures: false };

const PARTY = {
  name: 'Nombre',
  address: 'Calle 1',
  nit: '12345',
  identityCard: '',
  commercialRegistry: 'RC-1',
  bankAccount: '9200',
  bankBranch: 'Sucursal 1',
};

/** An invoice with every Res. 55 data point filled in. */
function complete(): Invoice {
  return {
    ...createInvoice('complete-1'),
    issueDate: '2026-09-19',
    concept: 'Venta de mercancías',
    seller: { ...PARTY },
    buyer: { ...PARTY },
    lines: [{ code: '', description: 'Pan', detail: '', unit: 'u', quantity: '2', unitPrice: '10' }],
    tax: { name: 'Impuesto sobre ventas', percent: '10' },
    carrier: { name: 'Portador', identityCard: '800101', plate: 'P123', waybill: '', railwayBox: '' },
    signatures: { delivers: 'Ana', receives: 'Luis', carrier: 'Omar', books: 'Iris' },
  };
}

function notes(invoice: Invoice, options = ALL_SECTIONS): Record<string, string> {
  return Object.fromEntries(pendingByZone(checkCompliance(invoice, options)));
}

describe('pendingByZone', () => {
  it('says what each zone of a new invoice still needs, in the order its sheet asks for it', () => {
    expect(notes(createInvoice('new-1'))).toEqual({
      document: 'Falta fecha',
      seller: 'Falta nombre, NIT, dirección, registro comercial, cuenta bancaria y sucursal bancaria',
      buyer: 'Falta nombre, NIT o carné y dirección',
      concept: 'Falta concepto',
      carrier: 'Falta nombre, carné y matrícula',
      'line-0': 'Falta descripción y precio',
      totals: 'Falta impuesto, porcentaje e importe total',
      signatures:
        'Falta firma de entrega, firma de recibo, firma del transportador y firma de contabilidad',
    });
  });

  it('has nothing to say about a complete invoice', () => {
    expect(notes(complete())).toEqual({});
  });

  it('names the buyer data still missing, as in "Falta NIT o carné y dirección"', () => {
    const invoice = complete();
    invoice.buyer = { ...invoice.buyer, nit: '', identityCard: '', address: '' };

    expect(notes(invoice)).toEqual({ buyer: 'Falta NIT o carné y dirección' });
  });

  it('puts each line data point on its own line', () => {
    const invoice = complete();
    invoice.lines = [
      invoice.lines[0],
      { code: '', description: 'Galletas', detail: '', unit: '', quantity: '0', unitPrice: '5' },
    ];

    expect(notes(invoice)).toEqual({ 'line-1': 'Falta cantidad y unidad' });
  });

  it('points a zero total at the totals, and the series and number at the document', () => {
    const invoice = { ...complete(), discount: '100', series: '', number: '' };

    expect(notes(invoice)).toEqual({ totals: 'Falta importe total', document: 'Falta serie y número' });
  });

  it('leaves out the carrier and the signatures while they are hidden', () => {
    const invoice = { ...complete(), carrier: createInvoice('x').carrier, signatures: createInvoice('x').signatures };

    expect(notes(invoice, NO_SECTIONS)).toEqual({});
  });
});
