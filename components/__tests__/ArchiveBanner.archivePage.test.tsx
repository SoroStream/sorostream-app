/**
 * ArchiveBanner (dashboard) and the /archive page read the same source,
 * getArchivedStreams(), and split the messaging:
 *
 * - The banner only points at the archive. It says how many streams were
 *   moved there and links to it, and it renders nothing when there are none,
 *   so a user with an empty archive is never sent to look at it.
 * - The archive page owns the empty state: "No archived streams yet…" with
 *   its illustration.
 *
 * So with zero archived streams there is exactly one empty-state message (the
 * page's), and with some, the banner's count matches what the page lists.
 */
import { render, screen } from '@testing-library/react';
import type { StreamData } from '@/src/lib/sorostream';
import ArchiveBanner from '../ArchiveBanner';
import ArchivePage from '@/src/app/archive/page';

let archived: StreamData[] = [];

vi.mock('@/src/lib/sorostream', async () => {
  const actual = await vi.importActual<typeof import('@/src/lib/sorostream')>(
    '@/src/lib/sorostream',
  );
  return { ...actual, getArchivedStreams: () => archived };
});

function archivedStream(id: string): StreamData {
  return {
    id,
    sender: 'GSENDER' + id,
    recipient: 'GRECIPIENT' + id,
    token: 'XLM',
    flowRate: 1,
    deposit: 1000,
    startTime: '2023-01-01T00:00:00Z',
    endTime: '2023-02-01T00:00:00Z',
    lastWithdrawTime: '2023-02-01T00:00:00Z',
    status: 'Ended',
  };
}

function renderBoth() {
  render(
    <>
      <ArchiveBanner />
      <ArchivePage />
    </>,
  );
}

describe('ArchiveBanner + /archive page messaging', () => {
  afterEach(() => {
    archived = [];
  });

  it('with zero archived streams: no banner, and the page shows the only empty state', async () => {
    archived = [];
    renderBoth();

    expect(
      await screen.findByText('No archived streams yet. Ended streams appear here after 30 days.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'No archived streams yet' })).toBeInTheDocument();

    // The banner neither duplicates the empty state nor contradicts it by
    // claiming streams were archived or linking to an empty archive.
    expect(screen.queryByText(/moved to the archive/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View archive/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/No archived streams/)).toHaveLength(1);
  });

  it('with archived streams: the banner count matches what the page lists, and no empty state', async () => {
    archived = [archivedStream('101'), archivedStream('102')];
    renderBoth();

    const banner = await screen.findByText(/moved to the archive/);
    expect(banner).toHaveTextContent('2 streams have been moved to the archive.');
    expect(screen.getByRole('link', { name: /View archive/ })).toHaveAttribute('href', '/archive');

    // The page lists both (it renders a desktop table and mobile cards).
    expect(screen.getAllByText('#101').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#102').length).toBeGreaterThan(0);
    expect(screen.queryByText(/No archived streams/)).not.toBeInTheDocument();
  });

  it('uses the singular for one archived stream', async () => {
    archived = [archivedStream('101')];
    render(<ArchiveBanner />);
    expect(await screen.findByText(/moved to the archive/)).toHaveTextContent(
      '1 stream has been moved to the archive.',
    );
  });
});
