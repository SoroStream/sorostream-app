import type { StreamEvent } from "./sorostream";

/** Sortable columns on the /activity page (#556). */
export type ActivitySortField = "date" | "type" | "amount";
export type SortDirection = "asc" | "desc";

export interface ActivitySort {
  field: ActivitySortField;
  dir: SortDirection;
}

const FIELDS: ActivitySortField[] = ["date", "type", "amount"];

/**
 * Parse the `?sort=&dir=` query params. Returns null (insertion order) when
 * `sort` is missing or unknown; `dir` defaults to "desc".
 */
export function parseActivitySort(
  sort: string | null | undefined,
  dir: string | null | undefined,
): ActivitySort | null {
  if (!sort || !FIELDS.includes(sort as ActivitySortField)) return null;
  return { field: sort as ActivitySortField, dir: dir === "asc" ? "asc" : "desc" };
}

/**
 * Next sort state when a column header is clicked: a new column starts
 * descending; clicking the active column flips the direction.
 */
export function toggleActivitySort(
  current: ActivitySort | null,
  field: ActivitySortField,
): ActivitySort {
  if (current?.field === field) {
    return { field, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { field, dir: "desc" };
}

function compare(a: StreamEvent, b: StreamEvent, field: ActivitySortField): number {
  switch (field) {
    case "date":
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    case "type":
      return a.type.localeCompare(b.type);
    case "amount": {
      // Events without an amount (creation, alert, …) sort as zero.
      const av = BigInt(a.amount ?? "0");
      const bv = BigInt(b.amount ?? "0");
      return av === bv ? 0 : av < bv ? -1 : 1;
    }
  }
}

/** Return a sorted copy of `events`; stable, so ties keep insertion order. */
export function sortActivityEvents(events: StreamEvent[], sort: ActivitySort | null): StreamEvent[] {
  if (!sort) return events;
  const sign = sort.dir === "asc" ? 1 : -1;
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => sign * compare(a.event, b.event, sort.field) || a.index - b.index)
    .map(({ event }) => event);
}
