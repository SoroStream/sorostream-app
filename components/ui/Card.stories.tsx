import type { Meta, StoryObj } from "@storybook/react";
import Card from "@/components/ui/Card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  argTypes: { padding: { control: "select", options: ["sm", "md", "lg"] } },
  args: { padding: "md", children: "Card content" },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {};
export const Small: Story = { args: { padding: "sm" } };
export const Large: Story = { args: { padding: "lg" } };
