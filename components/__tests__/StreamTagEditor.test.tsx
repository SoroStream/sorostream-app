import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import StreamTagEditor from "@/components/StreamTagEditor";
import { MAX_TAGS_PER_STREAM } from "@/src/lib/streamTags";

afterEach(() => { localStorage.clear(); cleanup(); });

describe("StreamTagEditor storage bounds", () => {
  it("rejects tags longer than the documented storage limit", () => {
    render(<StreamTagEditor streamId="stream" />);
    const input = screen.getByRole("textbox", { name: /add a tag/i });
    fireEvent.change(input, { target: { value: "x".repeat(33) } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent(/32 characters or fewer/i);
    expect(localStorage.getItem("sorostream-stream-tags")).toBeNull();
  });

  it("rejects tags beyond the per-stream maximum", async () => {
    render(<StreamTagEditor streamId="stream" />);
    const input = screen.getByRole("textbox", { name: /add a tag/i });
    for (let i = 0; i < MAX_TAGS_PER_STREAM; i++) {
      fireEvent.change(input, { target: { value: `tag${i}` } });
      fireEvent.keyDown(input, { key: "Enter" });
    }
    fireEvent.change(input, { target: { value: "extra" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/at most 20 tags/i);
  });
});
