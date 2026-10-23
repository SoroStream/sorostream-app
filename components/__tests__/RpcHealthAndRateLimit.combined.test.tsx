/**
 * RpcHealthIndicator / RpcUnreachableBanner (driven by useRpcHealth) and
 * RateLimitBanner (driven by RateLimitContext) are independent and can be on
 * screen together. Intended combined presentation, asserted below:
 *
 * - Degraded RPC + rate-limit backoff: the nav dot shows "degraded" (a
 *   rate-limited poll is itself one of the reasons useRpcHealth reports
 *   degraded) and the RateLimitBanner shows the retry countdown. Only the
 *   rate-limit banner is a full-width banner; the unreachable banner stays
 *   hidden because the endpoint is slow, not down. Each says something
 *   different: the dot is about latency, the banner about throttling.
 * - Unreachable RPC (> 60 s) + rate-limit backoff: both banners are visible.
 *   They don't duplicate each other: the unreachable banner is an assertive
 *   `alert` about the endpoint being offline, the rate-limit banner a polite
 *   `status` with the retry countdown, and neither repeats the other's text.
 * - Each indicator keeps working on its own (isolation cases at the end).
 */
import { render, screen, act, within } from '@testing-library/react';
import type { RpcHealthState } from '@/src/lib/useRpcHealth';
import RpcHealthIndicator, { RpcUnreachableBanner } from '../RpcHealthIndicator';
import RateLimitBanner from '../RateLimitBanner';
import { RateLimitProvider } from '@/src/context/RateLimitContext';
import { rpcFetch } from '@/src/lib/rpcClient';

let health: RpcHealthState;

vi.mock('@/src/lib/useRpcHealth', async () => {
  const actual = await vi.importActual<typeof import('@/src/lib/useRpcHealth')>(
    '@/src/lib/useRpcHealth',
  );
  return { ...actual, useRpcHealth: () => health };
});

const HEALTHY: RpcHealthState = {
  status: 'healthy',
  latencyMs: 120,
  lastChecked: new Date('2024-01-01T12:00:00Z'),
  showBanner: false,
};
const DEGRADED: RpcHealthState = { ...HEALTHY, status: 'degraded', latencyMs: 3400 };
const UNREACHABLE: RpcHealthState = {
  ...HEALTHY,
  status: 'unreachable',
  latencyMs: null,
  showBanner: true,
};

/** Same arrangement as the app: both banners in the layout, the dot in the nav. */
function Screen() {
  return (
    <RateLimitProvider>
      <RpcUnreachableBanner />
      <RateLimitBanner />
      <nav aria-label="Main">
        <RpcHealthIndicator />
      </nav>
    </RateLimitProvider>
  );
}

/**
 * Start a 429 backoff through the real rpcFetch path and leave it pending.
 * The promise is wrapped: returning it bare from an async function would make
 * the caller wait for the whole backoff, which needs the fake timers to run.
 */
async function startRateLimitBackoff() {
  const fn = vi
    .fn()
    .mockRejectedValueOnce(Object.assign(new Error('Too Many Requests'), { status: 429 }))
    .mockResolvedValueOnce('ok');
  let result: Promise<unknown> | undefined;
  await act(async () => {
    result = rpcFetch(fn);
  });
  return { done: result! };
}

async function finishBackoff({ done }: { done: Promise<unknown> }) {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  await done;
}

describe('RpcHealthIndicator + RateLimitBanner together', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    health = HEALTHY;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('degraded RPC + rate-limit backoff: dot shows degraded, only the rate-limit banner is shown', async () => {
    health = DEGRADED;
    render(<Screen />);
    const pending = await startRateLimitBackoff();

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('button', { name: 'RPC degraded — high latency' })).toBeInTheDocument();

    const rateBanner = screen.getByRole('status');
    expect(rateBanner).toHaveTextContent(/Rate limited/);
    expect(rateBanner).toHaveTextContent(/retrying in \d+s/);
    // The banner talks about throttling, not latency; the dot does the reverse.
    expect(rateBanner).not.toHaveTextContent(/latency|degraded/i);
    expect(within(nav).queryByText(/rate limit/i)).not.toBeInTheDocument();

    // Slow is not down: no unreachable alert, so exactly one banner.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await finishBackoff(pending);
  });

  it('unreachable RPC + rate-limit backoff: both banners, distinct roles and messages', async () => {
    health = UNREACHABLE;
    render(<Screen />);
    const pending = await startRateLimitBackoff();

    const alert = screen.getByRole('alert');
    const status = screen.getByRole('status');
    expect(alert).toHaveTextContent(/RPC unreachable/);
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(status).toHaveTextContent(/Rate limited/);
    expect(status).toHaveAttribute('aria-live', 'polite');

    // No duplicated information between the two.
    expect(alert).not.toHaveTextContent(/rate limit|retrying/i);
    expect(status).not.toHaveTextContent(/unreachable|offline/i);
    expect(screen.getAllByText(/Rate limited/)).toHaveLength(1);
    expect(screen.getAllByText(/RPC unreachable/)).toHaveLength(1);

    expect(screen.getByRole('button', { name: 'RPC unreachable' })).toBeInTheDocument();

    // When the backoff ends, only the rate-limit banner goes away.
    await finishBackoff(pending);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/RPC unreachable/);
  });

  describe('each indicator on its own', () => {
    it('degraded RPC without a rate limit: dot degraded, no banners', () => {
      health = DEGRADED;
      render(<Screen />);
      expect(screen.getByRole('button', { name: 'RPC degraded — high latency' })).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('unreachable RPC without a rate limit: only the unreachable banner', () => {
      health = UNREACHABLE;
      render(<Screen />);
      expect(screen.getByRole('alert')).toHaveTextContent(/RPC unreachable/);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('rate limit on a healthy RPC: only the rate-limit banner, dot stays healthy', async () => {
      render(<Screen />);
      const pending = await startRateLimitBackoff();
      expect(screen.getByRole('status')).toHaveTextContent(/Rate limited/);
      expect(screen.getByRole('button', { name: 'RPC healthy' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await finishBackoff(pending);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
