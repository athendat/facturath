/** The first button under `root` whose visible text is exactly `label`. */
export function findButton(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
