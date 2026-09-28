import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LiveCounter from '../LiveCounter';
import { sorostream } from '@/src/lib/sorostream';

const mockRpcFetch = vi.fn((fn: any) => fn());
vi.mock('@/src/lib/useRpcFetch', () => ({
  useRpcFetch: () => mockRpcFetch,
}));

vi.mock('@/components/FiatDisplay', () => ({
  default: () => null,
}));

describe('LiveCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('keeps local interpolation running between reconciliation checks', () => {
    render(
      <LiveCounter
        flowRate={10_000_000}
        lastWithdrawTime={new Date('2026-06-24T23:59:59.000Z')}
      />
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByLabelText('Claimable: 12.0000000 USDC')).toBeInTheDocument();
  });

  it('reconciles against the on-chain claimable balance for the stream', async () => {
    vi.spyOn(sorostream, 'getClaimable').mockResolvedValue('50000000');

    render(
      <LiveCounter
        streamId="stream-38"
        flowRate={10_000_000}
        lastWithdrawTime={new Date('2026-06-24T23:59:50.000Z')}
        reconcileIntervalMs={60_000}
      />
    );

    await act(async () => {});

    expect(sorostream.getClaimable).toHaveBeenCalledWith('stream-38');
    expect(screen.getByLabelText('Claimable: 5.0000000 USDC')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByLabelText('Claimable: 15.0000000 USDC')).toBeInTheDocument();
  });

  it('freezes the balance while the stream is paused', async () => {
    vi.spyOn(sorostream, 'getClaimable').mockResolvedValue('100000000'); // 10 USDC

    render(
      <LiveCounter
        streamId="stream-paused"
        flowRate={10_000_000}
        lastWithdrawTime={new Date('2026-06-25T00:00:00.000Z')}
        status="Paused"
        pausedAt="2026-06-25T00:00:10.000Z"
        reconcileIntervalMs={60_000}
      />
    );

    await act(async () => {});

    expect(screen.getByLabelText('Claimable: 10.0000000 USDC')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Balance must not advance while paused.
    expect(screen.getByLabelText('Claimable: 10.0000000 USDC')).toBeInTheDocument();
  });

  it('debounces display updates to one per 10 seconds', () => {
    render(
      <LiveCounter
        flowRate={10_000_000}
        lastWithdrawTime={new Date('2026-06-25T00:00:00.000Z')}
      />
    );

    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    expect(screen.getByLabelText('Claimable: 0.0000000 USDC')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByLabelText('Claimable: 10.0000000 USDC')).toBeInTheDocument();
  });

  it('does not update while off-screen and catches up when visible', () => {
    let trigger: (visible: boolean) => void = () => {};
    const original = global.IntersectionObserver;
    class MockIO {
      constructor(cb: IntersectionObserverCallback) {
        trigger = (visible) =>
          cb([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    global.IntersectionObserver = MockIO as unknown as typeof IntersectionObserver;

    render(
      <LiveCounter
        flowRate={10_000_000}
        lastWithdrawTime={new Date('2026-06-25T00:00:00.000Z')}
      />
    );

    act(() => trigger(false));
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByLabelText('Claimable: 0.0000000 USDC')).toBeInTheDocument();

    act(() => trigger(true));
    expect(screen.getByLabelText('Claimable: 30.0000000 USDC')).toBeInTheDocument();

    global.IntersectionObserver = original;
  });
});
