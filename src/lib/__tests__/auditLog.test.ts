import { describe, expect, it } from "vitest";
import {
  buildStreamAuditLog,
  getActivityEventsAll,
  type ActivityQuery,
} from "../sorostream";

describe("buildStreamAuditLog", () => {
  it("returns every event with timestamps and transaction hashes", () => {
    const log = buildStreamAuditLog();
    expect(log.count).toBe(log.events.length);
    expect(log.count).toBeGreaterThan(0);
    for (const entry of log.events) {
      expect(typeof entry.timestamp).toBe("string");
      expect(new Date(entry.timestamp).toString()).not.toBe("Invalid Date");
      expect(entry.transactionHash).toBeTruthy();
      expect(entry.streamId).toBeTruthy();
    }
  });

  it("orders events chronologically (oldest first)", () => {
    const log = buildStreamAuditLog();
    const times = log.events.map((e) => new Date(e.timestamp).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });

  it("applies the same filters as the activity feed", () => {
    const query: ActivityQuery = { asset: "USDC" };
    const log = buildStreamAuditLog(query);
    const all = getActivityEventsAll(query);
    expect(log.events.length).toBe(all.length);
    expect(log.events.every((e) => e.asset === "USDC")).toBe(true);
  });

  it("records the export scope and version in metadata", () => {
    const log = buildStreamAuditLog({ asset: "XLM" });
    expect(log.version).toBe(1);
    expect(typeof log.exportedAt).toBe("string");
    expect(log.filters.asset).toBe("XLM");
  });
});
