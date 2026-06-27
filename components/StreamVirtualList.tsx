"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import StreamCard from "@/components/StreamCard";
import type { StreamData } from "@/src/lib/sorostream";

interface StreamVirtualListProps {
  streams: StreamData[];
}

const ROW_HEIGHT = 340;
const OVERSCAN_ROWS = 3;

export default function StreamVirtualList({ streams }: StreamVirtualListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTop = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(760);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight || 760);
    };

    updateHeight();

    const handleScroll = () => {
      savedScrollTop.current = container.scrollTop;
      setScrollTop(container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateHeight);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop !== savedScrollTop.current) {
      container.scrollTop = savedScrollTop.current;
    }
  }, [streams.length]);

  const rowCount = useMemo(() => Math.ceil(streams.length / 2), [streams.length]);
  const totalHeight = rowCount * ROW_HEIGHT;

  const startRow = useMemo(() => {
    return Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  }, [scrollTop]);

  const endRow = useMemo(() => {
    return Math.min(
      rowCount,
      Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_ROWS,
    );
  }, [scrollTop, containerHeight, rowCount]);

  const visibleStreams = useMemo(
    () => streams.slice(startRow * 2, endRow * 2),
    [streams, startRow, endRow],
  );

  return (
    <div
      ref={containerRef}
      data-testid="stream-list"
      className="relative overflow-y-auto max-h-[calc(100vh-240px)]"
      role="list"
      aria-label="Stream list"
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${startRow * ROW_HEIGHT}px)`,
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {visibleStreams.map((stream) => (
              <Link key={stream.id} href={`/stream/${stream.id}`} className="block" role="listitem">
                <StreamCard
                  id={stream.id}
                  sender={stream.sender}
                  recipient={stream.recipient}
                  flowRate={stream.flowRate}
                  deposit={stream.deposit}
                  status={stream.status}
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
