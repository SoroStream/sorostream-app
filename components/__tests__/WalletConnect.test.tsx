import { render, screen, fireEvent, act } from '@testing-library/react';
import WalletConnect from '../WalletConnect';

// Mock the analytics module
vi.mock('@/src/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Mock wallets module inline to avoid hoisting errors and dynamic import timeouts
vi.mock('@/src/lib/wallets', () => {
  const mockFreighterAdapter = {
    type: 'freighter',
    isAvailable: vi.fn(() => new Promise<boolean>(resolve => {
      setTimeout(() => resolve(true), 50);
    })),
    getPublicKey: vi.fn(() => Promise.resolve('GB7TJKR6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5')),
    signTransaction: vi.fn(() => Promise.resolve('signed_xdr')),
    disconnect: vi.fn(),
  };

  const mockLedgerAdapter = {
    type: 'ledger',
    isAvailable: vi.fn(() => Promise.resolve(false)),
    getPublicKey: vi.fn(() => Promise.reject(new Error('Ledger transport not yet integrated'))),
    signTransaction: vi.fn(),
    disconnect: vi.fn(),
  };

  class MockServerKeypairAdapter {
    type = 'server-keypair';
    private secret: string;
    constructor(secret: string) {
      this.secret = secret;
    }
    isAvailable = vi.fn(() => Promise.resolve(true));
    getPublicKey = vi.fn(() => Promise.resolve('GCZEAELPDHRCOS7XZAFAQ7TMURYCMDH5GB6MLCO4KDYK3AS3HFEIY2EZ'));
    signTransaction = vi.fn();
    disconnect = vi.fn();
  }

  return {
    freighterAdapter: mockFreighterAdapter,
    ledgerAdapter: mockLedgerAdapter,
    ServerKeypairAdapter: MockServerKeypairAdapter,
    WALLET_LABELS: {
      freighter: 'Freighter',
      ledger: 'Ledger',
      'server-keypair': 'Server Keypair',
    },
  };
});

vi.mock('../../src/lib/wallets', () => {
  const mockFreighterAdapter = {
    type: 'freighter',
    isAvailable: vi.fn(() => new Promise<boolean>(resolve => {
      setTimeout(() => resolve(true), 50);
    })),
    getPublicKey: vi.fn(() => Promise.resolve('GB7TJKR6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5')),
    signTransaction: vi.fn(() => Promise.resolve('signed_xdr')),
    disconnect: vi.fn(),
  };

  const mockLedgerAdapter = {
    type: 'ledger',
    isAvailable: vi.fn(() => Promise.resolve(false)),
    getPublicKey: vi.fn(() => Promise.reject(new Error('Ledger transport not yet integrated'))),
    signTransaction: vi.fn(),
    disconnect: vi.fn(),
  };

  class MockServerKeypairAdapter {
    type = 'server-keypair';
    private secret: string;
    constructor(secret: string) {
      this.secret = secret;
    }
    isAvailable = vi.fn(() => Promise.resolve(true));
    getPublicKey = vi.fn(() => Promise.resolve('GCZEAELPDHRCOS7XZAFAQ7TMURYCMDH5GB6MLCO4KDYK3AS3HFEIY2EZ'));
    signTransaction = vi.fn();
    disconnect = vi.fn();
  }

  return {
    freighterAdapter: mockFreighterAdapter,
    ledgerAdapter: mockLedgerAdapter,
    ServerKeypairAdapter: MockServerKeypairAdapter,
    WALLET_LABELS: {
      freighter: 'Freighter',
      ledger: 'Ledger',
      'server-keypair': 'Server Keypair',
    },
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('WalletConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders connect button when not connected', () => {
    render(<WalletConnect />);
    expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
  });

  it('calls onConnect callback and saves to localStorage when wallet connects', async () => {
    const onConnect = vi.fn();
    render(<WalletConnect onConnect={onConnect} />);

    const button = screen.getByRole('button', { name: /connect freighter wallet/i });
    
    await act(async () => {
      fireEvent.click(button);
      // Wait for async operations/microtasks
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(onConnect).toHaveBeenCalledWith('GB7TJKR6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5', 'freighter');
    expect(window.localStorage.getItem('sorostream_wallet_connected')).toBe('true');
    expect(window.localStorage.getItem('sorostream_wallet_type')).toBe('freighter');
  });

  it('disables button while connecting', async () => {
    render(<WalletConnect />);
    const button = screen.getByRole('button', { name: /connect freighter wallet/i });
    
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(button).toBeDisabled();

    // Clean up the delayed connection promise
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
  });

  it('restores wallet connection from localStorage on mount', async () => {
    window.localStorage.setItem('sorostream_wallet_connected', 'true');
    window.localStorage.setItem('sorostream_wallet_type', 'freighter');

    const onConnect = vi.fn();
    
    render(<WalletConnect onConnect={onConnect} />);

    // Wait for the useEffect async autoReconnect to execute and trigger state update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    expect(screen.getByText(/GB7T…JQJ5/i)).toBeInTheDocument();
    expect(onConnect).toHaveBeenCalledWith('GB7TJKR6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5', 'freighter');
  });

  it('clears localStorage and state on disconnect', async () => {
    window.localStorage.setItem('sorostream_wallet_connected', 'true');
    window.localStorage.setItem('sorostream_wallet_type', 'freighter');

    render(<WalletConnect />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    
    await act(async () => {
      fireEvent.click(disconnectBtn);
    });

    expect(screen.getByRole('button', { name: /connect freighter wallet/i })).toBeInTheDocument();
    expect(window.localStorage.getItem('sorostream_wallet_connected')).toBeNull();
    expect(window.localStorage.getItem('sorostream_wallet_type')).toBeNull();
  });

  it('restores server keypair wallet from localStorage on mount', async () => {
    const validSecret = "SAQNO2S56BLRFHBBXE7PZ35IVYWMBU3HWZ2UUBU7M7EQNVGLKTWTVGRG";
    const expectedPublicKey = "GCZEAELPDHRCOS7XZAFAQ7TMURYCMDH5GB6MLCO4KDYK3AS3HFEIY2EZ";
    window.localStorage.setItem('sorostream_wallet_connected', 'true');
    window.localStorage.setItem('sorostream_wallet_type', 'server-keypair');
    window.localStorage.setItem('sorostream_wallet_secret', validSecret);

    const onConnect = vi.fn();

    render(<WalletConnect onConnect={onConnect} />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    expect(onConnect).toHaveBeenCalledWith(expectedPublicKey, 'server-keypair');
  });
});
