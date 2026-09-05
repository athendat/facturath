/** How one field of a document section renders: which key it binds, its aria-label and placeholder. */
export interface FieldSpec<T> {
  field: keyof T;
  label: string;
  placeholder: string;
}
