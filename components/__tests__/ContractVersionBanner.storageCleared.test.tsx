/**
 * #946: ContractVersionBanner reads the dismissed version from sessionStorage
 * once, at mount. If storage is cleared mid-session (quota eviction, an
 * extension wiping site data) the mounted banner keeps its in-memory
 * dismissal without crashing, and the next mount shows the banner again
 * because the stored dismissal is gone.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import type { ContractVersionState } from '@/src/lib/useContractVersion';
import ContractVersionBanner, { DISMISSED_VERSION_KEY } from '../ContractVersionBanner';

let versionState: ContractVersionState;

vi.mock('@/src/lib/useContractVersion', () => ({
  useContractVersion: () => versionState,
}));

const banner = () => screen.queryByText(/Update available/);

describe('ContractVersionBanner when sessionStorage is cleared mid-session', () => {
  beforeEach(() => {
    sessionStorage.clear();
    versionState = { mismatch: true, expectedVersion: '1.0.0', deployedVersion: '1.1.0', refetch: vi.fn() };
  });

  afterEach(() => vi.restoreAllMocks());

  it('keeps the current mount dismissed and shows the banner again on the next mount', () => {
    const { rerender, unmount } = render(<ContractVersionBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notice' }));
    expect(sessionStorage.getItem(DISMISSED_VERSION_KEY)).toBe('1.1.0');

    sessionStorage.clear();

    // The flag is only read at mount, so a re-check in the same mount stays hidden.
    expect(() => rerender(<ContractVersionBanner />)).not.toThrow();
    expect(banner()).not.toBeInTheDocument();

    // A fresh mount (navigation or reload) no longer finds the dismissal and shows it again.
    unmount();
    render(<ContractVersionBanner />);
    expect(banner()).toBeInTheDocument();
  });

  it('does not crash when sessionStorage starts throwing after the first read', () => {
    const { rerender, unmount } = render(<ContractVersionBanner />);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('cleared', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notice' }))).not.toThrow();
    rerender(<ContractVersionBanner />);
    expect(banner()).not.toBeInTheDocument();

    unmount();
    expect(() => render(<ContractVersionBanner />)).not.toThrow();
    expect(banner()).toBeInTheDocument();
  });
});
