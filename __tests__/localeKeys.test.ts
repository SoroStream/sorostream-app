/**
 * @vitest-environment node
 *
 * Locale key consistency tests (#846).
 *
 * en.json is the source of truth.  Every key present in en.json must also
 * exist in es.json and pt.json (no missing translations), and neither es.json
 * nor pt.json may contain keys that don't exist in en.json (no orphaned /
 * renamed keys).  Checked recursively so nested sections are covered too.
 */

import enRaw from "../src/locales/en.json";
import esRaw from "../src/locales/es.json";
import ptRaw from "../src/locales/pt.json";

type NestedRecord = { [key: string]: string | NestedRecord };

/** Flatten a nested locale object into dot-separated paths, e.g. "stream_new.title". */
function flatten(obj: NestedRecord, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      keys.push(...flatten(v as NestedRecord, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const enKeys = new Set(flatten(enRaw as unknown as NestedRecord));
const esKeys = new Set(flatten(esRaw as unknown as NestedRecord));
const ptKeys = new Set(flatten(ptRaw as unknown as NestedRecord));

describe("locale key consistency (#846)", () => {
  it("es.json contains every key from en.json", () => {
    const missing = [...enKeys].filter((k) => !esKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("pt.json contains every key from en.json", () => {
    const missing = [...enKeys].filter((k) => !ptKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("es.json has no keys absent from en.json", () => {
    const extra = [...esKeys].filter((k) => !enKeys.has(k));
    expect(extra).toEqual([]);
  });

  it("pt.json has no keys absent from en.json", () => {
    const extra = [...ptKeys].filter((k) => !enKeys.has(k));
    expect(extra).toEqual([]);
  });
});
