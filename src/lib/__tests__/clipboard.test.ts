import { describe, it, expect, vi, afterEach } from "vitest";
import { copyToClipboard } from "../clipboard";

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else setClipboard(undefined);
  vi.restoreAllMocks();
});

describe("copyToClipboard", () => {
  it("uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    expect(await copyToClipboard("abc")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("abc");
  });

  it("falls back to execCommand when the Clipboard API is missing (legacy browsers)", async () => {
    setClipboard(undefined);
    const exec = vi.fn().mockReturnValue(true);
    (document as any).execCommand = exec;
    expect(await copyToClipboard("abc")).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("falls back to execCommand when writeText rejects", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const exec = vi.fn().mockReturnValue(true);
    (document as any).execCommand = exec;
    expect(await copyToClipboard("abc")).toBe(true);
    expect(exec).toHaveBeenCalled();
  });

  it("returns false when every method fails", async () => {
    setClipboard(undefined);
    (document as any).execCommand = vi.fn().mockReturnValue(false);
    expect(await copyToClipboard("abc")).toBe(false);
    (document as any).execCommand = vi.fn(() => {
      throw new Error("unsupported");
    });
    expect(await copyToClipboard("abc")).toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });
});
