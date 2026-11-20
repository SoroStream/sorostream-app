/**
 * Issue #870 — StreamTagChips live-update via sorostream:tags-changed event
 *
 * Before the fix, StreamTagChips read tags only once per `streamId` change and
 * had no listener for storage or custom events. Tags edited via StreamTagEditor
 * (or any other call to addTagToStream / removeTagFromStream) on the same page
 * would not be reflected in the chips until the component remounted.
 *
 * The fix dispatches a `sorostream:tags-changed` CustomEvent from `streamTags`
 * on every write, and StreamTagChips listens for it to re-read localStorage.
 *
 * Tests:
 *  1. Regression — without a remount, chips stayed stale (documents the old bug).
 *  2. Fix — after adding a tag the chips update without remounting.
 *  3. Fix — after removing a tag the chips update without remounting.
 *  4. Chips controlled by the `tags` prop are not affected by the event.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";
import StreamTagChips from "@/components/StreamTagChips";
import { addTagToStream, removeTagFromStream, setTagsForStream } from "@/src/lib/streamTags";

afterEach(() => { localStorage.clear(); cleanup(); });

describe("StreamTagChips live-update (#870)", () => {
  it("displays tags that were present in localStorage at mount time", () => {
    setTagsForStream("stream-1", ["alpha", "beta"]);
    render(<StreamTagChips streamId="stream-1" />);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("updates chips when a tag is added elsewhere on the same page", async () => {
    setTagsForStream("stream-1", ["alpha"]);
    render(<StreamTagChips streamId="stream-1" />);
    expect(screen.queryByText("gamma")).not.toBeInTheDocument();

    // Simulate StreamTagEditor (or any caller) adding a tag.
    await act(async () => {
      addTagToStream("stream-1", "gamma");
    });

    expect(await screen.findByText("gamma")).toBeInTheDocument();
    // Existing tag must still be visible.
    expect(screen.getByText("alpha")).toBeInTheDocument();
  });

  it("updates chips when a tag is removed elsewhere on the same page", async () => {
    setTagsForStream("stream-1", ["alpha", "beta"]);
    render(<StreamTagChips streamId="stream-1" />);
    expect(screen.getByText("beta")).toBeInTheDocument();

    await act(async () => {
      removeTagFromStream("stream-1", "beta");
    });

    expect(screen.queryByText("beta")).not.toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
  });

  it("does not react to the event when controlled via the tags prop", async () => {
    // Prop-controlled instance must ignore storage changes; the caller owns the data.
    render(<StreamTagChips streamId="stream-1" tags={["controlled"]} />);
    expect(screen.getByText("controlled")).toBeInTheDocument();

    await act(async () => {
      addTagToStream("stream-1", "injected");
    });

    // "injected" must NOT appear because the component is prop-controlled.
    expect(screen.queryByText("injected")).not.toBeInTheDocument();
    expect(screen.getByText("controlled")).toBeInTheDocument();
  });

  it("renders nothing when all tags are removed", async () => {
    setTagsForStream("stream-1", ["only"]);
    const { container } = render(<StreamTagChips streamId="stream-1" />);
    expect(screen.getByText("only")).toBeInTheDocument();

    await act(async () => {
      removeTagFromStream("stream-1", "only");
    });

    // Component returns null when tags array is empty.
    expect(container.firstChild).toBeNull();
  });
});
