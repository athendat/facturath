/**
 * The 13 data points Resolución 55/2021 (Ministerio de Finanzas y Precios) requires on an
 * invoice, each with the rule that decides whether the open invoice fulfils it and the
 * first field to fill when it does not. The labels are the resolution's own wording.
 */

import type { Carrier, Invoice, Party, Signatures } from './invoice';
import { isPositiveNumber } from './money';
import { computeTotals } from './totals';

/**
 * Names one editable control of the document: a scalar of the invoice, a `section.field`
 * pair, or `lines.<index>.<field>`. `fieldElementId` turns it into the control's DOM id.
 */
export type FieldId =
  | 'issueDate'
  | 'series'
  | 'number'
  | 'concept'
  | `seller.${keyof Party}`
  | `buyer.${keyof Party}`
  | `carrier.${keyof Carrier}`
  | `signatures.${keyof Signatures}`
  | 'tax.name'
  | 'tax.percent'
  | `lines.${number}.description`
  | `lines.${number}.unit`
  | `lines.${number}.quantity`
  | `lines.${number}.unitPrice`;

export type ComplianceState = 'fulfilled' | 'pending' | 'not-applicable';

export interface ComplianceEntry {
  id: string;
  /** The data point as the resolution words it. */
  label: string;
  /** Where FACTURATH captures it. */
  where: string;
  state: ComplianceState;
  /** The first field still missing; null unless the entry is pending. */
  focusField: FieldId | null;
  /** Every field still missing, in the order `focusField` takes them; empty unless pending. */
  missing: readonly FieldId[];
}

export interface ComplianceOptions {
  showCarrier: boolean;
  showSignatures: boolean;
}

/** The DOM id of the control bound to `fieldId`, e.g. `field-seller-name`, `field-lines-0-unit-price`. */
export function fieldElementId(fieldId: FieldId): string {
  return `field-${fieldId.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replaceAll('.', '-')}`;
}

function filled(text: string): boolean {
  return text.trim() !== '';
}

/** Each of `fields` that is empty, in order; the first is the focus target. */
function allMissing(fields: readonly [FieldId, string][]): FieldId[] {
  return fields.filter(([, value]) => !filled(value)).map(([field]) => field);
}

function partyFields(role: 'seller' | 'buyer', party: Party, keys: readonly (keyof Party)[]) {
  return keys.map((key) => [`${role}.${key}`, party[key]] as [FieldId, string]);
}

const SIGNATURES: readonly { id: string; label: string; field: keyof Signatures }[] = [
  { id: 'signature-delivers', label: 'Nombre y firma de quien entrega y fecha de la entrega.', field: 'delivers' },
  { id: 'signature-receives', label: 'Nombre y firma de quien recibe y fecha de recepción.', field: 'receives' },
  { id: 'signature-carrier', label: 'Nombre y firma del transportador y fecha de recepción.', field: 'carrier' },
  { id: 'signature-books', label: 'Nombre y firma de quien contabiliza la factura.', field: 'books' },
];

const SIGNATURES_WHERE = 'Sección Firmas (opcional)';

const CARRIER_LABEL =
  'Nombre, identidad, matrícula, carta de porte y casilla del ferrocarril del transportista.';
const CARRIER_WHERE = 'Sección Transportista (opcional)';

/** The 13 entries, always in the resolution's order and with stable ids. */
export function checkCompliance(invoice: Invoice, options: ComplianceOptions): ComplianceEntry[] {
  const { seller, buyer, carrier, lines, tax, signatures } = invoice;
  const buyerIdentity: FieldId[] = filled(buyer.nit) || filled(buyer.identityCard) ? [] : ['buyer.nit'];

  return [
    entry('issue-date', 'Fecha de emisión.', 'Encabezado · fecha', allMissing([['issueDate', invoice.issueDate]])),
    entry(
      'seller',
      'Nombre, dirección, REEUP/ONEI, cuenta y sucursal bancaria, NIT y registro comercial del proveedor.',
      'Encabezado · tus datos',
      allMissing(
        partyFields('seller', seller, ['name', 'address', 'nit', 'commercialRegistry', 'bankAccount', 'bankBranch']),
      ),
    ),
    entry(
      'buyer',
      'Los mismos datos del comprador; personas naturales, número de identidad permanente.',
      'Bloque Comprador',
      [...allMissing(partyFields('buyer', buyer, ['name', 'address'])), ...buyerIdentity],
    ),
    entry(
      'concept',
      'Espacio para especificar el concepto de las operaciones.',
      'Bloque Concepto de la operación',
      allMissing([['concept', invoice.concept]]),
    ),
    options.showCarrier
      ? entry(
          'carrier',
          CARRIER_LABEL,
          CARRIER_WHERE,
          allMissing([
            ['carrier.name', carrier.name],
            ['carrier.identityCard', carrier.identityCard],
            ['carrier.plate', carrier.plate],
          ]),
        )
      : notApplicable('carrier', CARRIER_LABEL, CARRIER_WHERE),
    entry(
      'lines',
      'Código, descripción, unidad de medida, cantidad, precio unitario e importe.',
      'Tabla de líneas',
      missingLineFields(lines),
    ),
    entry(
      'tax',
      'Tipo impositivo y porciento.',
      'Totales · impuesto',
      allMissing([
        ['tax.name', tax.name],
        ['tax.percent', tax.percent],
      ]),
    ),
    entry(
      'total',
      'Importe total, subtotal cuando corresponda y moneda de pago.',
      'Totales y selector de moneda',
      computeTotals(invoice).total > 0 ? [] : ['lines.0.unitPrice'],
    ),
    ...SIGNATURES.map(({ id, label, field }) =>
      options.showSignatures
        ? entry(id, label, SIGNATURES_WHERE, allMissing([[`signatures.${field}`, signatures[field]]]))
        : notApplicable(id, label, SIGNATURES_WHERE),
    ),
    entry(
      'number',
      'Número consecutivo del modelo.',
      'Encabezado · serie y número',
      allMissing([
        ['series', invoice.series],
        ['number', invoice.number],
      ]),
    ),
  ];
}

/** Every line needs a description, a unit, a quantity above zero and a unit price; the code is optional. */
function missingLineFields(lines: Invoice['lines']): FieldId[] {
  return lines.flatMap((line, index): FieldId[] => [
    ...(filled(line.description) ? [] : [`lines.${index}.description` as const]),
    ...(filled(line.unit) ? [] : [`lines.${index}.unit` as const]),
    ...(isPositiveNumber(line.quantity) ? [] : [`lines.${index}.quantity` as const]),
    ...(filled(line.unitPrice) ? [] : [`lines.${index}.unitPrice` as const]),
  ]);
}

function entry(id: string, label: string, where: string, missing: FieldId[]): ComplianceEntry {
  return {
    id,
    label,
    where,
    state: missing.length === 0 ? 'fulfilled' : 'pending',
    focusField: missing[0] ?? null,
    missing,
  };
}

function notApplicable(id: string, label: string, where: string): ComplianceEntry {
  return { id, label, where, state: 'not-applicable', focusField: null, missing: [] };
}

export function countPending(entries: readonly ComplianceEntry[]): number {
  return entries.filter((item) => item.state === 'pending').length;
}
