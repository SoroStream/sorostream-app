import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SoroStream Widget",
  description: "Embeddable SoroStream payment widget",
  // Prevent search engines from indexing embed pages — they are not
  // standalone pages; they are meant to be iframed by third parties.
  robots: { index: false, follow: false },
};

/**
 * Embed layout — a deliberately bare shell for third-party embedding.
 *
 * PURPOSE
 * -------
 * Widgets served under /embed/* are designed to be iframed inside external
 * sites (partner dashboards, payment portals, etc.). Those host pages supply
 * their own navigation, footer, wallet UI, and global providers. Rendering
 * any of those here would:
 *   1. Break the host page's visual design.
 *   2. Attempt to re-initialise wallet providers that already exist on the
 *      host page, causing conflicts or double wallet-connect modals.
 *   3. Leak internal navigation chrome that the end user should never see.
 *
 * WHAT IS INTENTIONALLY EXCLUDED
 * --------------------------------
 *   - <NavHeader>    — desktop/mobile navigation bar
 *   - <BottomNav>    — mobile bottom tab bar
 *   - <AppFooter>    — site footer
 *   - WalletConnect  — wallet-connect bar / Freighter button
 *   - Any React context providers tied to the main app session
 *
 * This layout intentionally does NOT import or render any of those components.
 * The test in __tests__/embedIsolation.test.tsx verifies this isolation and
 * must be kept passing if this layout is ever refactored.
 *
 * See: feat/779 — embed widget layout isolation
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-transparent" data-embed="true">
        {children}
      </body>
    </html>
  );
}
