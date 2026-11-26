/**
 * #943: NetReceivedDisplay's trim() returns a value with no decimal point
 * unchanged (e.g. formatUSDC output for a round amount) instead of
 * appending or stripping anything.
 */
import { render, screen } from '@testing-library/react';
import NetReceivedDisplay from '@/components/NetReceivedDisplay';

vi.mock('@/src/lib/i18n', () => ({
  useTranslations: () => (key: string, vars?: Record<string, string>) =>
    key === 'net_received_fee_desc' ? `fee ${vars?.fee_percent}%` : key,
}));

const formatUSDC = vi.fn<(value: bigint) => string>();

vi.mock('@/src/lib/sorostream', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/sorostream')>();
  return {
    ...actual,
    getFeeConfig: vi.fn().mockResolvedValue({ basisPoints: 100 }),
    formatUSDC: (value: bigint) => formatUSDC(value),
  };
});

describe('NetReceivedDisplay trim() on strings without a decimal point', () => {
  beforeEach(() => formatUSDC.mockReset());

  it('returns a whole-number string unchanged', async () => {
    formatUSDC.mockImplementation((value) => (value === BigInt(990_000_000) ? '99' : '1'));
    render(<NetReceivedDisplay amount="100" tokenSymbol="USDC" />);
    expect(await screen.findByText('99 USDC')).toBeInTheDocument();
    expect(screen.getByText(/\(1 USDC fee\)/)).toBeInTheDocument();
  });

  it('does not strip zeros from the whole part', async () => {
    formatUSDC.mockImplementation((value) => (value === BigInt(9_900_000_000) ? '990' : '10'));
    render(<NetReceivedDisplay amount="1000" tokenSymbol="USDC" />);
    expect(await screen.findByText('990 USDC')).toBeInTheDocument();
    expect(screen.getByText(/\(10 USDC fee\)/)).toBeInTheDocument();
  });

  it('still trims trailing fractional zeros (for contrast)', async () => {
    formatUSDC.mockImplementation((value) => (value === BigInt(990_000_000) ? '99.5000000' : '1.0000000'));
    render(<NetReceivedDisplay amount="100" tokenSymbol="USDC" />);
    expect(await screen.findByText('99.5 USDC')).toBeInTheDocument();
    expect(screen.getByText(/\(1 USDC fee\)/)).toBeInTheDocument();
  });
});
