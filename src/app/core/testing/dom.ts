/** The first button under `root` whose visible text is exactly `label`. */
export function findButton(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}

/**
 * Types `text` into the input or textarea under `root` whose aria-label is exactly `label`,
 * the way a user would: sets the value and fires `input`. Await `fixture.whenStable()` after.
 */
export function typeInto(root: ParentNode, label: string, text: string): void {
  const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `input[aria-label="${label}"], textarea[aria-label="${label}"]`,
  );
  if (!field) {
    throw new Error(`No field labelled ${label}`);
  }
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}
