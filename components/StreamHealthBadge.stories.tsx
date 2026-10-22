import type { Meta, StoryObj } from "@storybook/react";
import StreamHealthBadge from "@/components/StreamHealthBadge";

const meta: Meta<typeof StreamHealthBadge> = {
  title: "UI/StreamHealthBadge",
  component: StreamHealthBadge,
  argTypes: {
    score: { control: { type: "range", min: 0, max: 100, step: 1 } },
    depositRemainingRatio: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    timeRemainingRatio: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    topUpCount: { control: { type: "number", min: 0, max: 10 } },
    compact: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof StreamHealthBadge>;

// ── Full-size (expandable tooltip) ───────────────────────────────────────

/**
 * Healthy stream — deposit and time both comfortably above thresholds,
 * no top-ups required. Score 75–100.
 */
export const Healthy: Story = {
  args: {
    score: 92,
    tier: "healthy",
    depositRemainingRatio: 0.85,
    timeRemainingRatio: 0.80,
    topUpCount: 0,
    compact: false,
  },
};

/**
 * Stream that needs attention — some deposit depleted and approaching
 * the midpoint of its duration. Score 40–74.
 */
export const Attention: Story = {
  args: {
    score: 58,
    tier: "attention",
    depositRemainingRatio: 0.45,
    timeRemainingRatio: 0.50,
    topUpCount: 1,
    compact: false,
  },
};

/**
 * At-risk stream — critically low deposit relative to remaining time,
 * multiple top-ups already recorded. Score 0–39.
 */
export const Critical: Story = {
  args: {
    score: 22,
    tier: "critical",
    depositRemainingRatio: 0.10,
    timeRemainingRatio: 0.65,
    topUpCount: 3,
    compact: false,
  },
};

// ── Compact chip variants (used inside StreamCard header) ─────────────────

/** Compact healthy chip — small colour-coded dot + score number. */
export const HealthyCompact: Story = {
  args: {
    score: 92,
    tier: "healthy",
    depositRemainingRatio: 0.85,
    timeRemainingRatio: 0.80,
    topUpCount: 0,
    compact: true,
  },
};

/** Compact attention chip. */
export const AttentionCompact: Story = {
  args: {
    score: 58,
    tier: "attention",
    depositRemainingRatio: 0.45,
    timeRemainingRatio: 0.50,
    topUpCount: 1,
    compact: true,
  },
};

/** Compact critical chip. */
export const CriticalCompact: Story = {
  args: {
    score: 22,
    tier: "critical",
    depositRemainingRatio: 0.10,
    timeRemainingRatio: 0.65,
    topUpCount: 3,
    compact: true,
  },
};
