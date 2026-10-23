/**
 * @jest-environment jsdom
 *
 * Embed layout isolation test for issue #779.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * src/app/embed/layout.tsx serves widgets that are iframed by third-party
 * sites. Its doc comment explicitly states: "no nav, footer, wallet connect
 * bar, or global providers — just the widget."
 *
 * Without a test, a future shared-component refactor could accidentally
 * reintroduce NavHeader, AppFooter, or WalletConnect into the embed layout
 * (e.g., by moving them into a shared layout ancestor, or by importing a new
 * "App shell" component that bundles all three).
 *
 * This test renders the embed stream page and asserts that none of those
 * components are present, and that the widget's own content IS present.
 *
 * THIRD-PARTY EMBEDDING CONTEXT
 * ------------------------------
 * The embed route is designed for scenarios such as:
 *   - A DeFi partner dashboard that wants to show a live stream status.
 *   - A payment portal that embeds the claimable-counter widget.
 *   - Any host page that iframes /embed/stream/:id.
 *
 * In all of these cases the host page already has its own nav, footer, and
 * wallet connection. Rendering SoroStream's versions would:
 *   1. Break the host's visual design.
 *   2. Attempt to re-initialise Freighter in a nested context, causing
 *      wallet connection conflicts.
 *   3. Expose internal navigation chrome that end users of the host page
 *      should never see.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import EmbedStreamPage from "../src/app/embed/stream/[id]/page";

// ---------------------------------------------------------------------------
// Minimal stubs so we can render the page in jsdom without Next.js internals.
// ---------------------------------------------------------------------------

jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Stub LiveCounter — it uses setInterval which is fine in jsdom but we
// control the clock via jest.useFakeTimers if needed; here a static render
// is enough for isolation assertions.
jest.mock("../components/LiveCounter", () => {
  const MockLiveCounter = () => (
    <span data-testid="embed-live-counter">0.0000000 USDC</span>
  );
  MockLiveCounter.displayName = "MockLiveCounter";
  return MockLiveCounter;
});

jest.mock("../components/StreamTimeline", () => {
  const MockStreamTimeline = () => <div data-testid="stream-timeline" />;
  MockStreamTimeline.displayName = "MockStreamTimeline";
  return MockStreamTimeline;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Embed stream page isolation (#779)", () => {
  const renderPage = () =>
    render(<EmbedStreamPage params={{ id: "42" }} />);

  /**
   * NavHeader must NOT appear in the embed layout output.
   * It is queried by its data-testid and its aria-label.
   */
  it("does not render NavHeader", () => {
    renderPage();
    // NavHeader renders a <header> with its own landmark; the drawer has
    // data-testid="nav-drawer". Neither should be present.
    expect(document.querySelector("header")).toBeNull();
    expect(screen.queryByTestId("nav-drawer")).toBeNull();
    // Also check the brand text that NavHeader always renders.
    expect(screen.queryByText("SoroStream", { selector: "a" })).toBeNull();
  });

  /**
   * AppFooter must NOT appear in the embed layout output.
   * It renders with data-testid="app-footer".
   */
  it("does not render AppFooter", () => {
    renderPage();
    expect(screen.queryByTestId("app-footer")).toBeNull();
    // AppFooter renders a <footer> element; confirm none present.
    expect(document.querySelector("footer")).toBeNull();
  });

  /**
   * WalletConnect must NOT appear in the embed layout output.
   * It renders a button with aria-label="Connect Freighter wallet".
   */
  it("does not render wallet-connect UI", () => {
    renderPage();
    expect(
      screen.queryByRole("button", { name: /connect.*wallet/i })
    ).toBeNull();
    expect(
      screen.queryByLabelText(/connect freighter wallet/i)
    ).toBeNull();
  });

  /**
   * The widget's core content must still render correctly.
   * - The stream ID is displayed.
   * - The live counter is present.
   * - The stream timeline is present.
   */
  it("renders the core widget content", () => {
    renderPage();
    // Stream ID shown in header
    expect(screen.getByText(/Stream #42/)).toBeInTheDocument();
    // Live counter widget
    expect(screen.getByTestId("embed-live-counter")).toBeInTheDocument();
    // Timeline
    expect(screen.getByTestId("stream-timeline")).toBeInTheDocument();
    // Container
    expect(screen.getByTestId("embed-stream-widget")).toBeInTheDocument();
  });
});
