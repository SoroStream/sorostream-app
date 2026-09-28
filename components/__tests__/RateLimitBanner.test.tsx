import { render, screen, act } from '@testing-library/react';
import RateLimitBanner from '../RateLimitBanner';
import { RateLimitProvider } from '@/src/context/RateLimitContext';
import { rpcFetch } from '@/src/lib/rpcClient';

describe('RateLimitBanner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is hidden when not rate limited', () => {
    render(
      <RateLimitProvider>
        <RateLimitBanner />
      </RateLimitProvider>,
    );
    expect(screen.queryByText(/Rate limited/)).not.toBeInTheDocument();
  });

  it('appears on a 429 response and auto-dismisses after the retry window', async () => {
    vi.useFakeTimers();
    render(
      <RateLimitProvider>
        <RateLimitBanner />
      </RateLimitProvider>,
    );

    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Too Many Requests'), { status: 429 }))
      .mockResolvedValueOnce('ok');

    let result: Promise<string> | undefined;
    await act(async () => {
      result = rpcFetch(fn);
    });

    expect(screen.getByText(/Rate limited/)).toBeInTheDocument();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await expect(result).resolves.toBe('ok');
    expect(screen.queryByText(/Rate limited/)).not.toBeInTheDocument();
  });
});
