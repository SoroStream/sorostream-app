import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetXlmUsdPrice =
  vi.fn<(options?: { force?: boolean }) => Promise<{ price: number | null; rateLimited: boolean }>>();

vi.mock('@/src/lib/xlmPrice', () => ({
  getXlmUsdPriceWithMeta: (options?: { force?: boolean }) => mockGetXlmUsdPrice(options),
}));

import { XlmPriceProvider, useSharedXlmPrice } from './XlmPriceContext';

function PriceConsumer({ id }: { id: string }) {
  const { price, refresh } = useSharedXlmPrice();
  return (
    <div>
      <span data-testid={`price-${id}`}>
        {price === null ? 'loading' : String(price)}
      </span>
      <button type="button" onClick={() => void refresh()}>
        refresh-{id}
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <XlmPriceProvider>
      <PriceConsumer id="one" />
      <PriceConsumer id="two" />
    </XlmPriceProvider>,
  );
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('XlmPriceContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetXlmUsdPrice.mockResolvedValue({ price: 0.125, rateLimited: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('manual refresh updates the shared price immediately for every consumer', async () => {
    mockGetXlmUsdPrice
      .mockResolvedValueOnce({ price: 0.1, rateLimited: false })
      .mockResolvedValueOnce({ price: 0.2, rateLimited: false });

    renderProvider();
    await flushPromises();

    expect(screen.getByTestId('price-one').textContent).toBe('0.1');
    expect(screen.getByTestId('price-two').textContent).toBe('0.1');

    // No timers are advanced: the refresh must not wait for the next tick.
    await act(async () => {
      fireEvent.click(screen.getByText('refresh-one'));
    });

    expect(screen.getByTestId('price-one').textContent).toBe('0.2');
    expect(screen.getByTestId('price-two').textContent).toBe('0.2');
  });

  it('manual refresh bypasses the price cache', async () => {
    renderProvider();
    await flushPromises();

    expect(mockGetXlmUsdPrice).toHaveBeenLastCalledWith({ force: false });

    await act(async () => {
      fireEvent.click(screen.getByText('refresh-one'));
    });

    expect(mockGetXlmUsdPrice).toHaveBeenLastCalledWith({ force: true });
  });

  it('manual refresh does not reset or duplicate the automatic interval timer', async () => {
    renderProvider();
    await flushPromises();
    expect(mockGetXlmUsdPrice).toHaveBeenCalledTimes(1);

    // Manual refresh halfway through the first interval.
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await act(async () => {
      fireEvent.click(screen.getByText('refresh-one'));
    });
    expect(mockGetXlmUsdPrice).toHaveBeenCalledTimes(2);

    // The original 60 s tick fires 30 s later: the timer was not restarted.
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await flushPromises();
    expect(mockGetXlmUsdPrice).toHaveBeenCalledTimes(3);

    // Exactly one automatic fetch per interval afterwards — no duplicate timer.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await flushPromises();
    expect(mockGetXlmUsdPrice).toHaveBeenCalledTimes(4);
  });

  it('concurrent manual refreshes share a single in-flight request', async () => {
    renderProvider();
    await flushPromises();
    expect(mockGetXlmUsdPrice).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByText('refresh-one'));
      fireEvent.click(screen.getByText('refresh-two'));
    });

    expect(mockGetXlmUsdPrice).toHaveBeenCalledTimes(2);
  });

  it('clears the update path on unmount', async () => {
    let resolvePrice: (meta: { price: number | null; rateLimited: boolean }) => void = () => {};
    mockGetXlmUsdPrice.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePrice = resolve;
      }),
    );

    const { unmount } = renderProvider();
    unmount();

    // Resolving after unmount must not throw or warn about state updates.
    await act(async () => {
      resolvePrice({ price: 0.5, rateLimited: false });
      await Promise.resolve();
    });

    expect(mockGetXlmUsdPrice).toHaveBeenCalledTimes(1);
  });
});
