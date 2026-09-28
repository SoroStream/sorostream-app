/**
 * Global modal stack (#647).
 *
 * Only one modal may be open at a time: when a new modal registers, every
 * modal already on the stack is asked to close via its `onClose` callback.
 * Modals without an `onClose` stay on the stack but are no longer topmost,
 * so only the topmost modal handles keyboard focus trapping.
 */
export interface ModalEntry {
  id: number;
  onClose?: () => void;
}

let nextId = 1;
const stack: ModalEntry[] = [];

export function pushModal(onClose?: () => void): number {
  const id = nextId++;
  const others = stack.splice(0, stack.length);
  stack.push({ id, onClose });
  // Close previously open modals outside the current call stack so React
  // state updates don't happen during another component's effect.
  others.forEach((m) => {
    if (m.onClose) queueMicrotask(m.onClose);
    else stack.unshift(m);
  });
  return id;
}

export function removeModal(id: number): void {
  const idx = stack.findIndex((m) => m.id === id);
  if (idx !== -1) stack.splice(idx, 1);
}

export function isTopModal(id: number): boolean {
  return stack.length > 0 && stack[stack.length - 1].id === id;
}

export function openModalCount(): number {
  return stack.length;
}

/** Test helper — clears the stack. */
export function resetModalStack(): void {
  stack.splice(0, stack.length);
}
