/**
 * Mobile date pickers (notably iOS Safari) open on an arbitrary date when the
 * input has no value. `primePickerToNow` is an onFocus handler that seeds the
 * DOM value with the current date/time so the native picker opens on today,
 * and restores the empty value on blur if the user did not pick anything.
 * React state is untouched: a real selection still arrives via onChange.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Local "YYYY-MM-DD" for the given instant. */
export function todayAsDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Local "YYYY-MM-DDTHH:mm" for the given instant. */
export function nowAsDatetimeLocal(now: Date = new Date()): string {
  return `${todayAsDate(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function primePickerToNow(e: { currentTarget: HTMLInputElement }): void {
  const el = e.currentTarget;
  if (el.value) return;
  const seeded = el.type === "date" ? todayAsDate() : nowAsDatetimeLocal();
  // Respect min/max so the seeded value never violates constraints.
  if ((el.min && seeded < el.min) || (el.max && seeded > el.max)) return;
  el.value = seeded;
  const restore = () => {
    el.removeEventListener("blur", restore);
    // If nothing was chosen (no change event), the value is still our seed.
    if (el.value === seeded && el.dataset.pickerTouched !== "1") el.value = "";
    delete el.dataset.pickerTouched;
  };
  const touched = () => {
    el.dataset.pickerTouched = "1";
  };
  el.addEventListener("change", touched, { once: true });
  el.addEventListener("blur", restore);
}
