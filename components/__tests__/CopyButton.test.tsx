import { render, screen, fireEvent, act } from '@testing-library/react';
import CopyButton from '../CopyButton';

const mockWriteText = vi.fn();

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: mockWriteText },
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CopyButton', () => {
  it('renders a copy button with default aria-label', () => {
    render(<CopyButton value="GBAM...BOEP" />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('renders a copy button with custom aria-label', () => {
    render(<CopyButton value="GBAM...BOEP" label="Copy address" />);
    expect(screen.getByRole('button', { name: 'Copy address' })).toBeInTheDocument();
  });

  it('copies the value to clipboard on click', async () => {
    mockWriteText.mockResolvedValueOnce(undefined);
    render(<CopyButton value="GBAMK6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5" />);

    const button = screen.getByRole('button', { name: 'Copy' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith('GBAMK6KZ3L3LYPZNAZQJR4HGLJ4E7MSTFJZXQZ2RL4QJKZKSX6JQJ5');
  });

  it('shows copied state after clicking and reverts after 2 seconds', async () => {
    vi.useFakeTimers();
    mockWriteText.mockResolvedValueOnce(undefined);
    render(<CopyButton value="GBAM...BOEP" />);

    const button = screen.getByRole('button', { name: 'Copy' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    vi.useRealTimers();
  });
});

  it('does not trigger a state update after unmount when the reset timer fires (#849)', async () => {
    vi.useFakeTimers();
    mockWriteText.mockResolvedValueOnce(undefined);

    // Spy on console.error to catch React's "state update on unmounted component" warning.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(<CopyButton value="GBAM...BOEP" />);
    const button = screen.getByRole('button', { name: 'Copy' });

    await act(async () => {
      fireEvent.click(button);
    });

    // Unmount before the 2-second reset timer fires.
    unmount();

    // Advance time past the reset delay — should not trigger any state update.
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    vi.useRealTimers();
  });
