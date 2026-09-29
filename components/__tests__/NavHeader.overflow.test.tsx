/**
 * Issue #542 — NavHeader nav items overflowed and visually overlapped the
 * wallet / network controls on medium-width viewports (~1024px–1280px),
 * producing a horizontal scrollbar on the page body.
 *
 * Following the convention in mobileResponsive.test.tsx, these assertions check
 * the responsive Tailwind classes in the source so the heavy, context-heavy
 * NavHeader does not need to be mounted.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const navSrc = readFileSync(resolve(ROOT, 'components/NavHeader.tsx'), 'utf8');

/** The header's inner flex row — the one holding nav + wallet controls. */
const headerRow = navSrc.match(
  /<div className="max-w-6xl mx-auto[^"]*">[\s\S]*?\n        <div className="flex items-center/,
)!;

/** The right-hand cluster holding the network selector and wallet button. */
const controlCluster = navSrc.match(
  /<div className="flex flex-wrap items-center justify-end[\s\S]*?<\/div>\s*<\/div>\s*<\/header>/,
)!;

const navLinksBlock = navSrc.match(/const NAV_LINKS = \[([\s\S]*?)\] as const;/)![1];

describe('NavHeader medium-width overflow (#542)', () => {
  it('wraps the header row instead of forcing a single fixed-height line', () => {
    expect(headerRow[0]).toContain('flex-wrap');
    // A fixed `h-14` clips wrapped content; `min-h-14` keeps the header at
    // least one row tall while still letting it grow.
    expect(headerRow[0]).not.toMatch(/\sh-14\s/);
    expect(headerRow[0]).toContain('min-h-14');
  });

  it('keeps a min-w-0 on the header row so it can shrink below its content width', () => {
    expect(headerRow[0]).toContain('min-w-0');
  });

  it('allows the nav list to wrap onto a second line', () => {
    expect(navSrc).toMatch(/<nav className="hidden sm:flex[^"]*flex-wrap[^"]*"/);
  });

  it('prevents individual nav links from being squeezed or broken mid-word', () => {
    expect(navSrc).toMatch(/className=\{`text-sm[^`]*whitespace-nowrap/);
  });

  it('wraps the wallet/network control cluster so it can never overlap the nav', () => {
    expect(navSrc).toMatch(
      /<div className="flex flex-wrap items-center justify-end[^"]*">\s*<GlobalSearch/,
    );
  });

  it('removes the overflow-hidden clip that used to hide the control cluster', () => {
    expect(navSrc).not.toMatch(/min-w-0 overflow-hidden/);
  });

  it('keeps the brand from shrinking so it never collides with the nav', () => {
    expect(navSrc).toMatch(
      /<Link href="\/" className="shrink-0 text-lg font-bold text-green-400/,
    );
  });

  it('keeps all 8 nav links mounted at 1024px, 1280px and 1440px (wrapping, not hiding)', () => {
    expect((navLinksBlock.match(/\{ href:/g) ?? []).length).toBe(8);

    // Nothing in the nav is breakpoint-hidden, so every link is reachable at
    // 1024px, 1280px and 1440px — the row simply reflows.
    const navTag = navSrc.match(/<nav className="([^"]*)"/)![1];
    expect(navTag).not.toMatch(/\b(lg|xl|2xl):hidden\b/);
  });

  it('keeps the network selector and wallet button in the same non-overlapping row', () => {
    expect(controlCluster[0]).toContain('<NetworkSelector />');
    expect(controlCluster[0]).toContain('<WalletConnect compact />');
  });

  it('keeps the wallet balance chip from being squeezed at medium widths', () => {
    expect(navSrc).toMatch(/hidden md:inline-block shrink-0/);
  });

  it('applies the same reflow behaviour in both light and dark themes', () => {
    // Light/dark variants sit on the same elements, so the reflow classes are
    // theme-agnostic; assert the header still carries both colour modes.
    const header = navSrc.match(/<header[\s\S]*?className=\{`sticky top-0[^`]*`\}/)![0];
    expect(header).toContain('bg-white');
    expect(header).toContain('dark:bg-gray-900');
  });
});
