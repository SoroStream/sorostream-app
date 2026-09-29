import { describe, it, expect } from "vitest";
import { mergeById } from "../mergeStreams";

describe("mergeById", () => {
  it("returns the previous array when nothing changed", () => {
    const prev = [{ id: "a", n: 1 }, { id: "b", n: 2 }];
    expect(mergeById(prev, [{ id: "a", n: 1 }, { id: "b", n: 2 }])).toBe(prev);
  });

  it("keeps references of unchanged items and replaces changed ones", () => {
    const prev = [{ id: "a", n: 1 }, { id: "b", n: 2 }];
    const out = mergeById(prev, [{ id: "a", n: 1 }, { id: "b", n: 3 }]);
    expect(out).not.toBe(prev);
    expect(out[0]).toBe(prev[0]);
    expect(out[1]).toEqual({ id: "b", n: 3 });
  });

  it("handles added and removed items", () => {
    const prev = [{ id: "a", n: 1 }];
    expect(mergeById(prev, [{ id: "a", n: 1 }, { id: "c", n: 9 }])).toHaveLength(2);
    expect(mergeById(prev, [])).toEqual([]);
  });
});
