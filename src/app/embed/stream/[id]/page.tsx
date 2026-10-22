import type { Metadata } from "next";
import LiveCounter from "@/components/LiveCounter";
import StreamTimeline from "@/components/StreamTimeline";

interface EmbedStreamPageProps {
  params: { id: string };
}

export function generateMetadata({ params }: EmbedStreamPageProps): Metadata {
  return {
    title: `Stream #${params.id} — SoroStream`,
  };
}

/**
 * Embeddable stream detail widget.
 *
 * Renders the core stream status (timeline progress + claimable counter) in a
 * self-contained card with no surrounding navigation, footer, or wallet UI.
 * This page is served inside the embed layout which explicitly excludes those
 * global components — see src/app/embed/layout.tsx for the full rationale.
 *
 * The widget is intended to be iframed by third-party sites that want to
 * display a live stream status without integrating the full SoroStream app.
 */
export default function EmbedStreamPage({ params }: EmbedStreamPageProps) {
  return (
    <main
      className="p-4 min-h-screen flex items-center justify-center"
      data-testid="embed-stream-widget"
    >
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-lg">
        {/* Widget header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">
            Stream #{params.id}
          </span>
          <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">
            Live
          </span>
        </div>

        {/* Stream progress timeline */}
        <StreamTimeline />

        {/* Live claimable counter — the widget's primary value */}
        <div className="text-center py-2">
          <p className="text-xs text-gray-400 mb-1">Claimable now</p>
          <div
            className="text-2xl font-bold"
            data-testid="embed-live-counter"
          >
            <LiveCounter flowRate={0} lastWithdrawTime={new Date()} />
          </div>
        </div>

        {/* Branded footer — small so it doesn't dominate the embed */}
        <div className="text-center pt-2 border-t border-gray-700">
          <span className="text-xs text-gray-600">
            Powered by{" "}
            <a
              href="https://sorostream-app.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-500"
            >
              SoroStream
            </a>
          </span>
        </div>
      </div>
    </main>
  );
}
