import type { Meta, StoryObj } from "@storybook/react";
import FlowRatePreview from "./FlowRatePreview";

const meta: Meta<typeof FlowRatePreview> = {
  title: "Components/FlowRatePreview",
  component: FlowRatePreview,
  tags: ["autodocs"],
  argTypes: {
    amount: { control: "text" },
    durationSeconds: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof FlowRatePreview>;

export const Default: Story = {
  args: {
    amount: "1000",
    durationSeconds: 2592000, // 30 days
  },
};

export const ShortStream: Story = {
  args: {
    amount: "50",
    durationSeconds: 3600, // 1 hour
  },
};

export const HighValueLongStream: Story = {
  args: {
    amount: "50000",
    durationSeconds: 31536000, // 1 year
  },
};
