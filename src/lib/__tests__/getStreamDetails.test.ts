import { describe, it, expect } from "vitest";
import { getStreamDetails } from "../sorostream";

describe("getStreamDetails (#603)", () => {
  it("returns stream, claimable and history in one call", async () => {
    const d = await getStreamDetails("1");
    expect(d.stream?.id).toBe("1");
    expect(typeof d.claimable).toBe("string");
    expect(d.history.length).toBeGreaterThan(0);
  });

  it("dedupes concurrent requests for the same id", () => {
    expect(getStreamDetails("1")).toBe(getStreamDetails("1"));
  });

  it("returns empty details for an unknown stream", async () => {
    const d = await getStreamDetails("does-not-exist");
    expect(d.stream).toBeNull();
    expect(d.history).toEqual([]);
  });
});
