/**
 * NotificationBadge clears as soon as the user navigates into its section.
 *
 * Renders the real NavHeader (which clears the active section on every
 * pathname change) with the real NotificationProvider. Unread counts are
 * seeded through the provider's own localStorage key, and timers are faked
 * so nothing but the navigation itself can clear a badge: no polling tick,
 * no cross-tab message.
 *
 * Cross-tab sync (NotificationContext's `storage` listener) is covered only
 * where it meets this behavior. A clear is persisted, so other tabs adopt
 * it, and a later update from another tab that already includes the clear
 * doesn't bring the badge back. The test never waits on that listener: it
 * dispatches the StorageEvent itself, so its timing can't race the
 * navigation clear.
 */
import { render, screen, act } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import NavHeader from '../NavHeader';
import { NotificationProvider } from '@/src/context/NotificationContext';

vi.mock('../NetworkSelector', () => ({ default: () => null }));
vi.mock('../WalletConnect', () => ({ default: () => null }));
vi.mock('../ThemeToggle', () => ({ default: () => null }));
vi.mock('../GlobalSearch', () => ({ default: () => null }));
vi.mock('../WalletBalanceDisplay', () => ({ default: () => null }));
vi.mock('../RpcHealthIndicator', () => ({ default: () => null }));
vi.mock('../ChangelogModal', () => ({ default: () => null, useChangelogUnread: () => false }));
vi.mock('../GlobalShortcuts', () => ({ useGlobalShortcuts: () => ({ openHelp: vi.fn() }) }));
vi.mock('@/src/context/SettingsContext', () => ({
  useSettings: () => ({ showUsd: false, toggleShowUsd: vi.fn(), language: 'en' }),
}));
vi.mock('@/src/context/WalletContext', () => ({
  useWallet: () => ({ address: null, balanceRefreshTrigger: 0 }),
}));
vi.mock('@/src/lib/network', () => ({
  useNetwork: () => ({ network: 'testnet', rpcUrl: '', setNetwork: vi.fn() }),
}));
vi.mock('@/src/lib/i18n', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/src/lib/useFocusTrap', () => ({ useFocusTrap: vi.fn() }));
// No new stream events: counts change only through what the test does.
vi.mock('@/src/lib/sorostream', () => ({ getStreamEvents: () => [{ id: 'seen' }] }));
vi.mock('@/src/lib/streamNotificationWatcher', () => ({
  checkStreamNotifications: vi.fn(async () => {}),
}));

const STORAGE_KEY = 'sorostream-notifications';

function seed(counts: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ counts, lastSeenId: 'seen' }));
}

function stored(): Record<string, number> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!).counts;
}

const badge = (section: string, n: number) =>
  screen.queryByRole('status', { name: `${n} unread ${section} update${n === 1 ? '' : 's'}` });

function renderAt(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname);
  const utils = render(
    <NotificationProvider>
      <NavHeader />
    </NotificationProvider>,
  );
  const navigate = (to: string) => {
    vi.mocked(usePathname).mockReturnValue(to);
    utils.rerender(
      <NotificationProvider>
        <NavHeader />
      </NotificationProvider>,
    );
  };
  return { ...utils, navigate };
}

describe('NotificationBadge clears on navigation into its section', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(usePathname).mockReturnValue('/');
  });

  it('clears the badge immediately when navigating into the section', () => {
    seed({ '/dashboard': 3, '/analytics': 2 });
    const { navigate } = renderAt('/');
    expect(badge('dashboard', 3)).toBeInTheDocument();

    navigate('/dashboard');

    // No timer has run: the navigation alone cleared it.
    expect(badge('dashboard', 3)).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /unread dashboard/ })).not.toBeInTheDocument();
    // Persisted, so other tabs pick the clear up through their storage event.
    expect(stored()['/dashboard']).toBe(0);
  });

  it('clears for a nested route inside the section', () => {
    seed({ '/analytics': 4 });
    const { navigate } = renderAt('/');
    navigate('/analytics/streams');
    expect(screen.queryByRole('status', { name: /unread analytics/ })).not.toBeInTheDocument();
  });

  it('keeps a nonzero count for sections the user has not visited', () => {
    seed({ '/dashboard': 3, '/analytics': 2 });
    const { navigate } = renderAt('/');
    navigate('/dashboard');

    expect(badge('analytics', 2)).toBeInTheDocument();
    // Still there after polling and notification checks have run.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(badge('analytics', 2)).toBeInTheDocument();
    expect(stored()['/analytics']).toBe(2);

    // And it clears in turn when that section is visited.
    navigate('/analytics');
    expect(screen.queryByRole('status', { name: /unread analytics/ })).not.toBeInTheDocument();
  });

  it('a later cross-tab update does not undo the clear', () => {
    seed({ '/dashboard': 3, '/analytics': 2 });
    const { navigate } = renderAt('/');
    navigate('/dashboard');

    // Another tab, having adopted the clear, records new analytics activity.
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify({ counts: { '/dashboard': 0, '/analytics': 5 }, lastSeenId: 'seen' }),
        }),
      );
    });

    expect(screen.queryByRole('status', { name: /unread dashboard/ })).not.toBeInTheDocument();
    expect(badge('analytics', 5)).toBeInTheDocument();
  });
});
