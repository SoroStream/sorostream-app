/**
 * #945: CollateralUnlockBadge is sender-only. It describes the collateral the
 * sender locked and the sender's claim on it, so a recipient sees nothing
 * even when collateral is held for the stream.
 */
import { render, screen } from '@testing-library/react';
import CollateralUnlockBadge from '@/components/CollateralUnlockBadge';

const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 86_400_000).toISOString();

describe('CollateralUnlockBadge visibility', () => {
  it('renders nothing for a recipient while collateral is locked', () => {
    const { container } = render(
      <CollateralUnlockBadge endTime={future()} isSender={false} hasCollateral collateralStroops={50_000_000} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a recipient after collateral unlocks, even with a claim handler', () => {
    const { container } = render(
      <CollateralUnlockBadge endTime={past()} isSender={false} hasCollateral onClaim={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'Claim' })).not.toBeInTheDocument();
  });

  it('renders for the sender with the same props', () => {
    render(<CollateralUnlockBadge endTime={future()} isSender hasCollateral collateralStroops={50_000_000} />);
    expect(screen.getByRole('status', { name: 'Collateral unlock countdown' })).toBeInTheDocument();
    expect(screen.getByText('5.00 XLM locked')).toBeInTheDocument();
  });
});
