import { fieldElementId, type ComplianceEntry, type FieldId } from '../../domain/compliance';

/**
 * One tappable part of the phone document (#64), each edited in its own bottom sheet:
 * the parts of the invoice in document order, with one zone per line.
 */
export type ZoneKey =
  | 'seller'
  | 'document'
  | 'buyer'
  | 'concept'
  | `line-${number}`
  | 'totals'
  | 'notes'
  | 'terms'
  | 'carrier'
  | 'signatures';

/**
 * What each field is called in a zone's "Falta ..." note, in the order the zone's sheet asks
 * for them, which is also the order the note lists them in. Lines drop their index here.
 */
const NOUNS: Readonly<Record<string, string>> = {
  issueDate: 'fecha',
  series: 'serie',
  number: 'número',
  'seller.name': 'nombre',
  'seller.nit': 'NIT',
  'seller.address': 'dirección',
  'seller.commercialRegistry': 'registro comercial',
  'seller.bankAccount': 'cuenta bancaria',
  'seller.bankBranch': 'sucursal bancaria',
  'buyer.name': 'nombre',
  // The buyer needs a NIT or an identity card; the compliance rules point at the NIT.
  'buyer.nit': 'NIT o carné',
  'buyer.address': 'dirección',
  concept: 'concepto',
  'lines.description': 'descripción',
  'lines.quantity': 'cantidad',
  'lines.unit': 'unidad',
  'lines.unitPrice': 'precio',
  'tax.name': 'impuesto',
  'tax.percent': 'porcentaje',
  'carrier.name': 'nombre',
  'carrier.identityCard': 'carné',
  'carrier.plate': 'matrícula',
  'signatures.delivers': 'firma de entrega',
  'signatures.receives': 'firma de recibo',
  'signatures.carrier': 'firma del transportador',
  'signatures.books': 'firma de contabilidad',
};

const ORDER = Object.keys(NOUNS);

/** A total that is not above zero; it follows every field of the totals zone. */
const TOTAL_NOUN = 'importe total';

/**
 * The id a sheet gives the control of `field`. Never the id the inline sheet uses, since
 * both are in the page while a sheet is open and FieldFocus finds a control by its id.
 */
export function sheetFieldId(field: FieldId): string {
  return `sheet-${fieldElementId(field)}`;
}

/** The zone whose sheet edits `field`. */
export function zoneOfField(field: FieldId): ZoneKey {
  const [section, index] = field.split('.');
  switch (section) {
    case 'issueDate':
    case 'series':
    case 'number':
      return 'document';
    case 'lines':
      return `line-${Number(index)}`;
    case 'tax':
      return 'totals';
    default:
      return section as 'seller' | 'buyer' | 'concept' | 'carrier' | 'signatures';
  }
}

/** The key `field` has in `NOUNS`: its section and name, without a line index. */
function nounKey(field: FieldId): string {
  return field.replace(/^lines\.\d+\./, 'lines.');
}

/** `a`, `a y b`, `a, b y c`; before a word starting with an "i" sound Spanish writes "e". */
function joinSpanish(words: readonly string[]): string {
  if (words.length < 2) {
    return words.join('');
  }
  const last = words[words.length - 1];
  const and = /^h?i(?!e)/i.test(last) ? 'e' : 'y';
  return `${words.slice(0, -1).join(', ')} ${and} ${last}`;
}

/**
 * What each zone still needs for Res. 55/2021, e.g. `buyer` → `Falta NIT o carné y dirección`,
 * grouped from the pending compliance entries. Zones with nothing pending are left out.
 */
export function pendingByZone(entries: readonly ComplianceEntry[]): Map<ZoneKey, string> {
  const byZone = new Map<ZoneKey, { rank: number; noun: string }[]>();
  const add = (zone: ZoneKey, rank: number, noun: string): void => {
    byZone.set(zone, [...(byZone.get(zone) ?? []), { rank, noun }]);
  };
  for (const entry of entries) {
    if (entry.state !== 'pending') {
      continue;
    }
    if (entry.id === 'total') {
      add('totals', ORDER.length, TOTAL_NOUN);
      continue;
    }
    for (const field of entry.missing) {
      add(zoneOfField(field), ORDER.indexOf(nounKey(field)), NOUNS[nounKey(field)]);
    }
  }
  return new Map(
    [...byZone].map(([zone, nouns]) => [
      zone,
      `Falta ${joinSpanish(nouns.sort((a, b) => a.rank - b.rank).map(({ noun }) => noun))}`,
    ]),
  );
}
