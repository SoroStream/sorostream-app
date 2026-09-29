import type { Meta, StoryObj } from "@storybook/react";
import CountdownTimer from "./CountdownTimer";

const meta: Meta<typeof CountdownTimer> = {
  title: "Components/CountdownTimer",
  component: CountdownTimer,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CountdownTimer>;

export const Active: Story = {
  args: {
    endTime: new Date(Date.now() + 86400000 * 3 + 3600000 * 4), // 3 days 4 hours from now
  },
};

export const NearExpiry: Story = {
  args: {
    endTime: new Date(Date.now() + 60000), // 1 minute from now
  },
};

export const Expired: Story = {
  args: {
    endTime: new Date(Date.now() - 10000), // Already expired
    expiredLabel: "Stream Ended",
  },
};
