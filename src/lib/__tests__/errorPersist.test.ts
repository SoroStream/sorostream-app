import { describe, expect, it, beforeEach } from "vitest";
import {
  readPersistedStreamError,
  writePersistedStreamError,
  clearPersistedStreamError,
} from "../errorPersist";

const STREAM_A = "stream-a";
const STREAM_B = "stream-b";

beforeEach(() => {
  sessionStorage.clear();
});

describe("errorPersist", () => {
  it("returns null when nothing has been persisted", () => {
    expect(readPersistedStreamError(STREAM_A)).toBeNull();
  });

  it("persists and reads back an error message for a given stream id", () => {
    writePersistedStreamError(STREAM_A, "Stream not found.");
    expect(readPersistedStreamError(STREAM_A)).toBe("Stream not found.");
  });

  it("keeps errors for different stream ids isolated", () => {
    writePersistedStreamError(STREAM_A, "Stream not found.");
    writePersistedStreamError(STREAM_B, "Network timeout.");
    expect(readPersistedStreamError(STREAM_A)).toBe("Stream not found.");
    expect(readPersistedStreamError(STREAM_B)).toBe("Network timeout.");
  });

  it("survives a simulated remount (sessionStorage persists across navigation)", () => {
    writePersistedStreamError(STREAM_A, "Network timeout: stream data could not be loaded.");
    // A remount just re-reads from sessionStorage — nothing to reset here,
    // which is exactly the point: the error is not lost.
    expect(readPersistedStreamError(STREAM_A)).toBe(
      "Network timeout: stream data could not be loaded.",
    );
  });

  it("clears a persisted error", () => {
    writePersistedStreamError(STREAM_A, "Stream not found.");
    clearPersistedStreamError(STREAM_A);
    expect(readPersistedStreamError(STREAM_A)).toBeNull();
  });

  it("ignores an empty stream id", () => {
    writePersistedStreamError("", "should not be stored");
    expect(readPersistedStreamError("")).toBeNull();
  });
});
