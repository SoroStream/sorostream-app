import { render, screen, fireEvent } from '@testing-library/react';
import WalletConnect from '../WalletConnect';

// Mock the freighter module
vi.mock('@/src/lib/freighter', () => ({
  getFreighterAdapter: vi.fn(() => Promise.resolve({
    isConnected: async () => true,
    getPublicKey: async () => 'GB7TJKR6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5',
    signTransaction: async () => 'signed_xdr',
  })),
}));

// Mock the analytics module
vi.mock('@/src/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('WalletConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders connect button when not connected', () => {
    render(<WalletConnect />);
    expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
  });

  it('calls onConnect callback when wallet connects', async () => {
    const onConnect = vi.fn();
    render(<WalletConnect onConnect={onConnect} />);

    const button = screen.getByRole('button', { name: /connect freighter wallet/i });
    fireEvent.click(button);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onConnect).toHaveBeenCalledWith('GB7TJKR6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5');
  });

  it('disables button while connecting', () => {
    render(<WalletConnect />);
    const button = screen.getByRole('button', { name: /connect freighter wallet/i });
    
    fireEvent.click(button);
    expect(button).toBeDisabled();
  });
});
