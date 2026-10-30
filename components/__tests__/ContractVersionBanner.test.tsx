/**
 * ContractVersionBanner dismissal: once the user dismisses the banner for a
 * mismatch it stays hidden for that same deployed version for the rest of
 * the session (sessionStorage), and shows again when the contract later
 * reports a different version.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import type { ContractVersionState } from '@/src/lib/useContractVersion';
import ContractVersionBanner, { DISMISSED_VERSION_KEY } from '../ContractVersionBanner';

let versionState: ContractVersionState;

vi.mock('@/src/lib/useContractVersion', () => ({
  useContractVersion: () => versionState,
}));

const mismatchOn = (deployedVersion: string): ContractVersionState => ({
  mismatch: true,
  expectedVersion: '1.0.0',
  deployedVersion,
});

const banner = () => screen.queryByText(/Update available/);

describe('ContractVersionBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('is hidden when the versions match', () => {
    versionState = { mismatch: false, expectedVersion: '1.0.0', deployedVersion: '1.0.0' };
    render(<ContractVersionBanner />);
    expect(banner()).not.toBeInTheDocument();
  });

  it('does not reappear for the same mismatch after being dismissed in this session', () => {
    versionState = mismatchOn('1.1.0');
    const { rerender, unmount } = render(<ContractVersionBanner />);
    expect(banner()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notice' }));
    expect(banner()).not.toBeInTheDocument();
    expect(sessionStorage.getItem(DISMISSED_VERSION_KEY)).toBe('1.1.0');

    // A later re-check reporting the same version keeps it hidden...
    versionState = mismatchOn('1.1.0');
    rerender(<ContractVersionBanner />);
    expect(banner()).not.toBeInTheDocument();

    // ...and so does a fresh mount (a reload or navigation in the same tab).
    unmount();
    render(<ContractVersionBanner />);
    expect(banner()).not.toBeInTheDocument();
  });

  it('reappears when the deployed version changes again after a dismissal', () => {
    versionState = mismatchOn('1.1.0');
    const { rerender } = render(<ContractVersionBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notice' }));
    expect(banner()).not.toBeInTheDocument();

    // Another contract upgrade: a new mismatch the user has not seen.
    versionState = mismatchOn('1.2.0');
    rerender(<ContractVersionBanner />);
    expect(banner()).toBeInTheDocument();
  });

  it('dismissal is session-only: a new session shows the banner again', () => {
    versionState = mismatchOn('1.1.0');
    const { unmount } = render(<ContractVersionBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notice' }));
    unmount();

    sessionStorage.clear(); // what closing the tab does
    render(<ContractVersionBanner />);
    expect(banner()).toBeInTheDocument();
    expect(localStorage.getItem(DISMISSED_VERSION_KEY)).toBeNull();
  });
});
