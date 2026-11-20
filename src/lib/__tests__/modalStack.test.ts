import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  pushModal,
  removeModal,
  markModalClosing,
  isModalClosing,
  isTopModal,
  openModalCount,
  resetModalStack,
} from "../modalStack";

/** Let queued onClose microtasks run. */
const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("modalStack", () => {
  beforeEach(() => {
    resetModalStack();
  });

  it("closes a fully open modal when a new one is pushed", async () => {
    const onCloseA = vi.fn();
    const a = pushModal(onCloseA);
    const b = pushModal(vi.fn());

    await flushMicrotasks();

    expect(onCloseA).toHaveBeenCalledTimes(1);
    expect(isTopModal(b)).toBe(true);
    expect(isTopModal(a)).toBe(false);
    expect(openModalCount()).toBe(1);
  });

  it("keeps modals without onClose on the stack below the new modal", () => {
    const a = pushModal();
    const b = pushModal(vi.fn());

    expect(openModalCount()).toBe(2);
    expect(isTopModal(b)).toBe(true);
    expect(isTopModal(a)).toBe(false);
  });

  it("does not call onClose again on a modal that is mid-close (#711)", async () => {
    const onCloseA = vi.fn();
    const a = pushModal(onCloseA);

    // Modal A starts its own close animation and stays mounted for now.
    markModalClosing(a);
    expect(isModalClosing(a)).toBe(true);

    const b = pushModal(vi.fn());
    await flushMicrotasks();

    expect(onCloseA).not.toHaveBeenCalled();
    expect(isTopModal(b)).toBe(true);

    // A finishes its animation and unmounts.
    removeModal(a);
    expect(openModalCount()).toBe(1);
  });

  it("fires onClose at most once when several modals are pushed during a close", async () => {
    const onCloseA = vi.fn();
    pushModal(onCloseA);
    pushModal(vi.fn());
    pushModal(vi.fn());
    pushModal(vi.fn());

    await flushMicrotasks();

    expect(onCloseA).toHaveBeenCalledTimes(1);
  });

  it("calls the originally-open modal's onClose once when pushModal is called twice synchronously before microtasks run", async () => {
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const onCloseC = vi.fn();

    const a = pushModal(onCloseA);
    const b = pushModal(onCloseB);
    const c = pushModal(onCloseC);

    // Neither queued onClose should have fired synchronously yet.
    expect(onCloseA).not.toHaveBeenCalled();
    expect(onCloseB).not.toHaveBeenCalled();
    expect(isTopModal(c)).toBe(true);
    expect(isTopModal(a)).toBe(false);
    expect(isTopModal(b)).toBe(false);
    expect(openModalCount()).toBe(1);

    await flushMicrotasks();

    expect(onCloseA).toHaveBeenCalledTimes(1);
    expect(onCloseB).toHaveBeenCalledTimes(1);
    expect(onCloseC).not.toHaveBeenCalled();
    expect(isTopModal(c)).toBe(true);
    expect(openModalCount()).toBe(1);
  });

  it("marking an unknown id is a no-op", () => {
    expect(() => markModalClosing(999)).not.toThrow();
    expect(isModalClosing(999)).toBe(false);
  });
});
