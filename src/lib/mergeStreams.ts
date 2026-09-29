/**
 * Merges freshly fetched items into the previous list, keeping the previous
 * object reference for every item whose fields are unchanged. Memoized rows
 * then skip re-rendering and only the changed sections update.
 * Returns `prev` itself when nothing changed.
 */
export function mergeById<T extends { id: string }>(prev: T[], next: T[]): T[] {
  const prevById = new Map(prev.map((item) => [item.id, item]));
  let changed = prev.length !== next.length;
  const merged = next.map((item, i) => {
    const old = prevById.get(item.id);
    if (old && shallowEqual(old, item)) {
      if (prev[i] !== old) changed = true;
      return old;
    }
    changed = true;
    return item;
  });
  return changed ? merged : prev;
}

function valueEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return false;
}

function shallowEqual(a: object, b: object): boolean {
  const ka = Object.keys(a) as (keyof typeof a)[];
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => valueEqual(a[k], (b as typeof a)[k]));
}
