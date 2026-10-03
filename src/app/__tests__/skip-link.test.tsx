import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

/**
 * The skip link lives in the root layout (src/app/layout.tsx), which wraps
 * every page — not in an individual page component. Testing it means
 * rendering RootLayout itself, which pulls in the app's full provider tree
 * and several leaf components with their own side effects (analytics,
 * PWA install prompts, web vitals reporting, etc.) that aren't relevant
 * here, so those are stubbed out below.
 */

vi.mock('@/src/lib/env', () => ({ validateEnv: vi.fn() }));
vi.mock('@/src/lib/analytics', () => ({ initAnalytics: vi.fn(), trackEvent: vi.fn() }));

vi.mock('@/components/NavHeader', () => ({ default: () => null }));
vi.mock('@/components/BottomNav', () => ({ default: () => null }));
vi.mock('@/components/AppFooter', () => ({ default: () => null }));
vi.mock('@/components/OnboardingWizard', () => ({ default: () => null }));
vi.mock('@/src/components/SessionWarningToast', () => ({ SessionWarningToast: () => null }));
vi.mock('@/src/components/SessionTimeoutModal', () => ({ SessionTimeoutModal: () => null }));
vi.mock('@/src/components/PwaInit', () => ({ default: () => null }));
vi.mock('@/src/components/InstallPrompt', () => ({ default: () => null }));
vi.mock('@/src/components/PageViewTracker', () => ({ default: () => null }));
vi.mock('@/components/GlobalShortcuts', () => ({
  GlobalShortcutsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/src/components/WebVitalsReporter', () => ({ default: () => null }));
vi.mock('@/components/RpcHealthIndicator', () => ({ RpcUnreachableBanner: () => null }));
vi.mock('@/components/RateLimitBanner', () => ({ default: () => null }));
vi.mock('@/components/ContractVersionBanner', () => ({ default: () => null }));

import RootLayout from '../layout';
import HomePage from '../page';

function renderLayout() {
  return render(
    <RootLayout>
      <div>page content</div>
    </RootLayout>,
  );
}

describe('Skip Navigation Link', () => {
  it('renders the skip link as the first focusable element', () => {
    renderLayout();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
  });

  it('has the correct href pointing to #main-content', () => {
    renderLayout();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('has the skip-link class for styling', () => {
    renderLayout();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveClass('skip-link');
  });

  it('main content has id="main-content"', () => {
    render(<HomePage />);
    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveAttribute('id', 'main-content');
  });
});
