/**
 * #944: once the user has acknowledged the unverified-address warning, the
 * warning stays hidden even if the address is re-verified and the status
 * flips back to "unverified" in the same render tree. The acknowledgement is
 * owned by the parent (which resets it when the address changes), so this is
 * intended behaviour, not an oversight.
 */
import { render, screen } from '@testing-library/react';
import AddressVerificationWarning from '@/components/AddressVerificationWarning';
import type { AddressVerification } from '@/src/lib/addressVerification';

vi.mock('@/src/lib/i18n', () => ({
  useTranslations: () => (key: string) =>
    key === 'address_unverified_warning_title' ? 'Unverified Address' : key,
}));

const verification = (status: AddressVerification['status']): AddressVerification => ({
  status,
  address: 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3UN3IXYNEP',
  federationName: null,
  accountExists: status === 'verified',
  error: null,
  lastCheckedAt: Date.now(),
});

const warning = () => screen.queryByText('Unverified Address');

describe('AddressVerificationWarning acknowledgement across re-verification', () => {
  it('stays hidden after acknowledgement when status goes unverified -> verified -> unverified', () => {
    const onAcknowledge = vi.fn();
    const { rerender } = render(
      <AddressVerificationWarning verification={verification('unverified')} acknowledged={false} onAcknowledge={onAcknowledge} />,
    );
    expect(warning()).toBeInTheDocument();

    rerender(<AddressVerificationWarning verification={verification('unverified')} acknowledged onAcknowledge={onAcknowledge} />);
    expect(warning()).not.toBeInTheDocument();

    rerender(<AddressVerificationWarning verification={verification('verified')} acknowledged onAcknowledge={onAcknowledge} />);
    expect(warning()).not.toBeInTheDocument();

    rerender(<AddressVerificationWarning verification={verification('unverified')} acknowledged onAcknowledge={onAcknowledge} />);
    expect(warning()).not.toBeInTheDocument();
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it('shows again only once the parent clears the acknowledgement', () => {
    const { rerender } = render(
      <AddressVerificationWarning verification={verification('unverified')} acknowledged onAcknowledge={vi.fn()} />,
    );
    expect(warning()).not.toBeInTheDocument();
    rerender(<AddressVerificationWarning verification={verification('unverified')} acknowledged={false} onAcknowledge={vi.fn()} />);
    expect(warning()).toBeInTheDocument();
  });
});
